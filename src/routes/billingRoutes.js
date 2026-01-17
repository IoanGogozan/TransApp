const express = require("express");
const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const prisma = require("../config/prismaClient");
const { getStripe } = require("../utils/stripeClient");
const { vippsRequest, stopVippsAgreement } = require("../lib/vippsClient");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

const sendError = (res, status, code, message = code, details) =>
  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });

const ensureDev = (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    sendError(res, 404, "NOT_FOUND");
    return false;
  }
  return true;
};

// Vipps env: VIPPS_PRICE_BASIC_ORE, VIPPS_PRICE_MEDIUM_ORE, VIPPS_PRICE_PRO_ORE, VIPPS_CURRENCY
const getVippsPlanConfig = (plan) => {
  const currencyEnv = process.env.VIPPS_CURRENCY;
  const currency = currencyEnv ? currencyEnv.trim() : "NOK";
  if (currencyEnv && !/^[A-Za-z]{3}$/.test(currency)) {
    const err = new Error("VIPPS_CURRENCY must be a 3-letter code");
    err.code = "VIPPS_CURRENCY_INVALID";
    return err;
  }
  const map = {
    BASIC: { amountEnv: "VIPPS_PRICE_BASIC_ORE", name: "TransApp Basic" },
    MEDIUM: { amountEnv: "VIPPS_PRICE_MEDIUM_ORE", name: "TransApp Medium" },
    PRO: { amountEnv: "VIPPS_PRICE_PRO_ORE", name: "TransApp Pro" },
  };

  const cfg = map[plan];
  if (!cfg) return null;

  const amountStr = process.env[cfg.amountEnv];
  const amount = amountStr ? Number.parseInt(amountStr, 10) : NaN;

  if (!amountStr || !Number.isInteger(amount) || amount <= 0) {
    const err = new Error("VIPPS_PRICE_NOT_CONFIGURED");
    err.code = "VIPPS_PRICE_NOT_CONFIGURED";
    err.missing = [cfg.amountEnv];
    err.message = !amountStr
      ? `Missing ${cfg.amountEnv}`
      : `Invalid ${cfg.amountEnv}`;
    return err;
  }

  return { amount, currency, productName: cfg.name };
};

const stripeErrorToResponse = (err) => {
  const code = err?.code || null;
  const declineCode = err?.decline_code || null;
  let message = "Payment failed. Please try again.";

  switch (code) {
    case "card_declined":
      message = "Card was declined. Try another card.";
      break;
    case "expired_card":
      message = "Card is expired. Use another card.";
      break;
    case "incorrect_cvc":
      message = "Incorrect CVC.";
      break;
    case "insufficient_funds":
      message = "Insufficient funds.";
      break;
    case "authentication_required":
      message = "Authentication required. Try again.";
      break;
    default:
      break;
  }

  return {
    error: {
      code: "PAYMENT_ERROR",
      message,
      ...(code || declineCode ? { details: { stripeCode: code, declineCode } } : {}),
    },
  };
};

const formatVippsDueDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

router.get(
  "/status",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const {
      plan,
      status,
      trialStart,
      trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      canceledAt,
      pastDueAt,
      vippsAgreementId,
      vippsAgreementStatus,
      stripeCustomerId,
      stripeSubscriptionId,
    } = req.subscription;

    const companyId = req.user?.companyId ?? req.companyId;
    const billingProvider = stripeSubscriptionId
      ? "STRIPE"
      : vippsAgreementId
        ? "VIPPS"
        : null;

    return res.json({
      companyId,
      billingProvider,
      subscription: {
        plan,
        status,
        trialStart,
        trialEnd,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        canceledAt,
        pastDueAt,
        vippsAgreementId,
        vippsAgreementStatus,
        stripeCustomerId,
        stripeSubscriptionId,
      },
    });
  }),
);

router.get(
  "/vipps/charges",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (!req.subscription.vippsAgreementId) {
      return res.json({ charges: [] });
    }

    const charges = await prisma.vippsCharge.findMany({
      where: { subscriptionId: req.subscription.id },
      orderBy: { dueDate: "desc" },
      take: 10,
    });

    return res.json({
      charges: charges.map((charge) => ({
        id: charge.id,
        agreementId: charge.agreementId,
        chargeId: charge.chargeId,
        externalId: charge.externalId,
        dueDate: charge.dueDate,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        createdAt: charge.createdAt,
        updatedAt: charge.updatedAt,
      })),
    });
  }),
);

router.post(
  "/vipps/agreements",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (
      req.subscription.stripeSubscriptionId &&
      ["TRIALING", "ACTIVE", "PAST_DUE"].includes(req.subscription.status)
    ) {
      return sendError(res, 409, "BILLING_PROVIDER_CONFLICT", "BILLING_PROVIDER_CONFLICT", {
        provider: "STRIPE",
      });
    }

    if (req.subscription.vippsAgreementId) {
      return sendError(res, 409, "VIPPS_AGREEMENT_EXISTS");
    }

    const { plan, phoneNumber } = req.body || {};
    const planValue = typeof plan === "string" ? plan.toUpperCase() : null;
    const validPlans = new Set(["BASIC", "MEDIUM", "PRO"]);
    if (!planValue || !validPlans.has(planValue)) {
      return sendError(res, 400, "INVALID_PLAN");
    }

    const vippsPlanConfig = getVippsPlanConfig(planValue);
    if (!vippsPlanConfig) {
      return sendError(res, 400, "INVALID_PLAN");
    }
    if (vippsPlanConfig instanceof Error) {
      return sendError(
        res,
        500,
        vippsPlanConfig.code || "VIPPS_PRICE_NOT_CONFIGURED",
        vippsPlanConfig.message,
        { missing: vippsPlanConfig.missing },
      );
    }

    const requiredEnv = [
      "VIPPS_CLIENT_ID",
      "VIPPS_CLIENT_SECRET",
      "VIPPS_SUBSCRIPTION_KEY",
      "VIPPS_MSN",
      "PUBLIC_APP_URL",
    ];
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      return sendError(res, 500, "VIPPS_NOT_CONFIGURED", "VIPPS_NOT_CONFIGURED", { missing });
    }

    const companySlug = req.params.companySlug;
    const agreementPayload = {
      interval: { unit: "MONTH", count: 1 },
      merchantRedirectUrl: `${process.env.PUBLIC_APP_URL}/c/${companySlug}/billing/vipps/return`,
      merchantAgreementUrl: `${process.env.PUBLIC_APP_URL}/c/${companySlug}/app/admin/billing`,
      pricing: {
        amount: vippsPlanConfig.amount,
        currency: vippsPlanConfig.currency,
      },
      productDescription: "Transport time tracking subscription",
      productName: vippsPlanConfig.productName,
    };

    if (typeof phoneNumber === "string" && phoneNumber.trim()) {
      agreementPayload.phoneNumber = phoneNumber.trim();
    }

    let vippsResponse;
    try {
      vippsResponse = await vippsRequest("/recurring/v3/agreements", {
        method: "POST",
        body: agreementPayload,
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (err) {
      return sendError(
        res,
        502,
        "VIPPS_API_ERROR",
        err?.message || "Vipps request failed.",
      );
    }

    const { agreementId, vippsConfirmationUrl } = vippsResponse || {};
    if (!agreementId || !vippsConfirmationUrl) {
      return sendError(res, 502, "VIPPS_AGREEMENT_FAILED");
    }

    const companyId = req.user?.companyId ?? req.company?.id ?? req.companyId;
    if (!companyId) {
      return sendError(res, 400, "COMPANY_NOT_FOUND");
    }

    await prisma.subscription.update({
      where: { companyId },
      data: {
        plan: planValue,
        vippsAgreementId: agreementId,
        vippsAgreementStatus: "PENDING",
      },
    });

    return res.json({ agreementId, vippsConfirmationUrl });
  }),
);

router.post(
  "/vipps/change-plan",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (!req.subscription.vippsAgreementId) {
      return sendError(res, 400, "VIPPS_AGREEMENT_MISSING");
    }

    const { plan } = req.body || {};
    const planValue = typeof plan === "string" ? plan.toUpperCase() : null;
    const validPlans = new Set(["BASIC", "MEDIUM", "PRO"]);
    if (!planValue || !validPlans.has(planValue)) {
      return sendError(res, 400, "INVALID_PLAN");
    }

    await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: { plan: planValue },
    });

    return res.json({ ok: true, plan: planValue });
  }),
);

router.post(
  "/vipps/test-create-charge",
  asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return sendError(res, 403, "NOT_ALLOWED_IN_PRODUCTION");
    }

    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (!req.subscription.vippsAgreementId) {
      return sendError(res, 400, "VIPPS_AGREEMENT_MISSING");
    }

    const vippsPlanConfig = getVippsPlanConfig(req.subscription.plan);
    if (vippsPlanConfig instanceof Error) {
      return sendError(
        res,
        500,
        vippsPlanConfig.code || "VIPPS_PRICE_NOT_CONFIGURED",
        vippsPlanConfig.message,
        { missing: vippsPlanConfig.missing },
      );
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);
    const due = formatVippsDueDate(dueDate);
    const orderId = crypto.randomUUID();
    const externalId = `manual_${req.subscription.id}_${Date.now()}`;

    try {
      await vippsRequest(
        `/recurring/v3/agreements/${req.subscription.vippsAgreementId}/charges`,
        {
          method: "POST",
          body: {
            amount: vippsPlanConfig.amount,
            description: `TRANSAPP ${req.subscription.plan} - test charge`,
            due,
            retryDays: 14,
            transactionType: "DIRECT_CAPTURE",
            orderId,
          },
        }
      );
    } catch (err) {
      return sendError(
        res,
        502,
        "VIPPS_API_ERROR",
        err?.message || "Vipps request failed.",
      );
    }

    await prisma.vippsCharge.create({
      data: {
        subscriptionId: req.subscription.id,
        agreementId: req.subscription.vippsAgreementId,
        chargeId: orderId,
        externalId,
        dueDate,
        amount: vippsPlanConfig.amount,
        currency: vippsPlanConfig.currency,
        status: "CREATED",
      },
    });

    return res.json({ ok: true, orderId, dueDate: due });
  }),
);

router.post(
  "/vipps/cancel",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const { vippsAgreementId } = req.subscription;
    if (!vippsAgreementId) {
      return sendError(res, 400, "VIPPS_AGREEMENT_MISSING");
    }

    await stopVippsAgreement(vippsAgreementId);

    await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: {
        vippsAgreementStatus: "STOPPED",
        status: "CANCELED",
        canceledAt: new Date(),
      },
    });

    return res.json({ ok: true });
  }),
);

router.post(
  "/vipps/sync",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const agreementId = req.subscription.vippsAgreementId;
    if (!agreementId) {
      return sendError(res, 400, "VIPPS_AGREEMENT_MISSING");
    }

    let vippsAgreement;
    try {
      vippsAgreement = await vippsRequest(`/recurring/v3/agreements/${agreementId}`, {
        method: "GET",
      });
    } catch (err) {
      return sendError(
        res,
        502,
        "VIPPS_API_ERROR",
        err?.message || "Vipps request failed.",
      );
    }

    const agreementStatus =
      vippsAgreement?.agreementStatus || vippsAgreement?.status || null;
    const updated = await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: { vippsAgreementStatus: agreementStatus },
    });

    return res.json({
      vippsAgreementStatus: agreementStatus,
      subscriptionStatus: updated.status,
      isVippsActive: agreementStatus === "ACTIVE",
    });
  }),
);

router.post(
  "/reactivate",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const { status, trialEnd } = req.subscription;
    if (status === "CANCELED" || status === "EXPIRED") {
      const trialEndDate = new Date(trialEnd);
      if (Date.now() < trialEndDate.getTime()) {
        const updated = await prisma.subscription.update({
          where: { id: req.subscription.id },
          data: {
            status: "TRIALING",
            canceledAt: null,
            cancelAtPeriodEnd: false,
            pastDueAt: null,
          },
        });
        return res.json({ subscription: updated });
      }

      return sendError(res, 409, "PAYMENT_REQUIRED");
    }

    return res.json({ subscription: req.subscription });
  }),
);

router.post(
  "/stripe/setup-intent",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const companyId = req.user?.companyId ?? req.company?.id ?? req.companyId;
    if (!companyId) {
      return sendError(res, 400, "COMPANY_NOT_FOUND");
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return sendError(res, 500, "STRIPE_NOT_CONFIGURED");
    }

    try {
      let customerId = req.subscription.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { companyId: String(companyId) },
        });
        customerId = customer.id;
        await prisma.subscription.update({
          where: { companyId },
          data: { stripeCustomerId: customerId },
        });
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      return res.json({ clientSecret: setupIntent.client_secret });
    } catch (err) {
      if (err && (err.type || err.code)) {
        return res.status(402).json(stripeErrorToResponse(err));
      }
      throw err;
    }
  }),
);

router.post(
  "/stripe/portal",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (!process.env.PUBLIC_APP_URL) {
      return sendError(res, 500, "PUBLIC_APP_URL_REQUIRED");
    }

    const companyId = req.user?.companyId ?? req.company?.id ?? req.companyId;
    if (!companyId) {
      return sendError(res, 400, "COMPANY_NOT_FOUND");
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return sendError(res, 500, "STRIPE_NOT_CONFIGURED");
    }

    let customerId = req.subscription.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { companyId: String(companyId) },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { companyId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.PUBLIC_APP_URL}/c/${req.params.companySlug}/app/admin/billing`,
    });

    return res.json({ url: session.url });
  }),
);

router.post(
  "/stripe/subscribe",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    if (
      req.subscription.vippsAgreementId &&
      req.subscription.vippsAgreementStatus !== "STOPPED" &&
      ["TRIALING", "ACTIVE", "PAST_DUE"].includes(req.subscription.status)
    ) {
      return sendError(res, 409, "BILLING_PROVIDER_CONFLICT", "BILLING_PROVIDER_CONFLICT", {
        provider: "VIPPS",
      });
    }

    const { plan, paymentMethodId } = req.body || {};
    const planValue = typeof plan === "string" ? plan.toUpperCase() : null;
    const validPlans = new Set(["BASIC", "MEDIUM", "PRO"]);
    if (!planValue || !validPlans.has(planValue)) {
      return sendError(res, 400, "INVALID_PLAN");
    }

    const priceIdMap = {
      BASIC: process.env.STRIPE_PRICE_BASIC,
      MEDIUM: process.env.STRIPE_PRICE_MEDIUM,
      PRO: process.env.STRIPE_PRICE_PRO,
    };
    const priceId = priceIdMap[planValue];
    if (!priceId) {
      return sendError(res, 500, "STRIPE_PRICE_NOT_CONFIGURED");
    }

    const companyId = req.user?.companyId ?? req.company?.id ?? req.companyId;
    if (!companyId) {
      return sendError(res, 400, "COMPANY_NOT_FOUND");
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return sendError(res, 500, "STRIPE_NOT_CONFIGURED");
    }

    if (req.subscription.stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          req.subscription.stripeSubscriptionId,
        );
        const itemId = stripeSub?.items?.data?.[0]?.id;
        if (!itemId) {
          return sendError(res, 500, "STRIPE_SUBSCRIPTION_INVALID");
        }

        const updatedSub = await stripe.subscriptions.update(
          req.subscription.stripeSubscriptionId,
          {
            items: [{ id: itemId, price: priceId }],
            proration_behavior: "create_prorations",
          },
        );

        await prisma.subscription.update({
          where: { companyId },
          data: { plan: planValue },
        });

        return res.json({
          subscriptionId: updatedSub.id,
          status: updatedSub.status,
          updated: true,
        });
      } catch (err) {
        if (err && (err.type || err.code)) {
          return res.status(402).json(stripeErrorToResponse(err));
        }
        throw err;
      }
    }

    if (!paymentMethodId || typeof paymentMethodId !== "string") {
      return sendError(res, 400, "INVALID_PAYMENT_METHOD");
    }

    try {
      let customerId = req.subscription.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: { companyId: String(companyId) },
        });
        customerId = customer.id;
        await prisma.subscription.update({
          where: { companyId },
          data: { stripeCustomerId: customerId },
        });
      }

      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      const stripeSub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 14,
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
      });

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      await prisma.subscription.update({
        where: { companyId },
        data: {
          plan: planValue,
          status: "TRIALING",
          stripeSubscriptionId: stripeSub.id,
          trialStart: now,
          trialEnd,
          currentPeriodStart: null,
          currentPeriodEnd: null,
        },
      });

      return res.json({ subscriptionId: stripeSub.id, status: stripeSub.status });
    } catch (err) {
      if (err && (err.type || err.code)) {
        return res.status(402).json(stripeErrorToResponse(err));
      }
      throw err;
    }
  }),
);

router.post(
  "/dev/reset-trial",
  requireRole("ADMIN", "PLATFORM_ADMIN"),
  asyncHandler(async (req, res) => {
    if (!ensureDev(req, res)) return;
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: {
        status: "TRIALING",
        trialStart: now,
        trialEnd,
        pastDueAt: null,
        canceledAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    return res.json({ subscription: updated });
  }),
);

router.post(
  "/dev/activate",
  requireRole("ADMIN", "PLATFORM_ADMIN"),
  asyncHandler(async (req, res) => {
    if (!ensureDev(req, res)) return;
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: {
        status: "ACTIVE",
        pastDueAt: null,
        canceledAt: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return res.json({ subscription: updated });
  }),
);

router.post(
  "/dev/past-due",
  requireRole("ADMIN", "PLATFORM_ADMIN"),
  asyncHandler(async (req, res) => {
    if (!ensureDev(req, res)) return;
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const updated = await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: {
        status: "PAST_DUE",
        pastDueAt: req.subscription.pastDueAt ?? new Date(),
      },
    });

    return res.json({ subscription: updated });
  }),
);

router.post(
  "/dev/cancel",
  requireRole("ADMIN", "PLATFORM_ADMIN"),
  asyncHandler(async (req, res) => {
    if (!ensureDev(req, res)) return;
    if (!req.subscription) {
      return sendError(res, 404, "SUBSCRIPTION_NOT_FOUND");
    }

    const updated = await prisma.subscription.update({
      where: { id: req.subscription.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
    });

    return res.json({ subscription: updated });
  }),
);

module.exports = router;
