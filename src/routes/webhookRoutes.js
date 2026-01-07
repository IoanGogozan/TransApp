const express = require("express");
const crypto = require("crypto");
const prisma = require("../config/prismaClient");
const { getStripe } = require("../utils/stripeClient");

const router = express.Router();

const mapStripeStatus = (status) => {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "PAST_DUE";
  }
};

const mapPriceToPlan = (priceId) => {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BASIC) return "BASIC";
  if (priceId === process.env.STRIPE_PRICE_MEDIUM) return "MEDIUM";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  return null;
};

const toDate = (unixSeconds) => {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000);
};

const updateSubscriptionFromStripe = async (stripeSub) => {
  if (!stripeSub) return;
  const stripeSubscriptionId = stripeSub.id;
  const stripeCustomerId =
    typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id;
  const priceId = stripeSub.items?.data?.[0]?.price?.id;

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId },
        ...(stripeCustomerId ? [{ stripeCustomerId }] : []),
      ],
    },
  });

  if (!existing) return;

  const plan = mapPriceToPlan(priceId);
  const nextStatus = mapStripeStatus(stripeSub.status);
  const data = {
    status: nextStatus,
    currentPeriodStart: toDate(stripeSub.current_period_start),
    currentPeriodEnd: toDate(stripeSub.current_period_end),
    trialStart: toDate(stripeSub.trial_start) || existing.trialStart,
    trialEnd: toDate(stripeSub.trial_end) || existing.trialEnd,
    stripeSubscriptionId,
    stripeCustomerId: stripeCustomerId || existing.stripeCustomerId,
  };
  if (plan) {
    data.plan = plan;
  }
  if (nextStatus === "PAST_DUE") {
    data.pastDueAt = existing.pastDueAt ?? new Date();
  } else if (nextStatus === "ACTIVE") {
    data.pastDueAt = null;
  }

  await prisma.subscription.update({
    where: { id: existing.id },
    data,
  });
};

router.post("/stripe", async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: "STRIPE_WEBHOOK_SECRET_REQUIRED" });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return res.status(500).json({ error: "STRIPE_NOT_CONFIGURED" });
  }

  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return res.status(400).json({ error: "MISSING_STRIPE_SIGNATURE" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: "INVALID_STRIPE_SIGNATURE" });
  }

  let webhookEvent;
  try {
    webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: "STRIPE",
        eventId: event.id,
        payload: event,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.json({ received: true });
    }
    throw err;
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data?.object;
        await updateSubscriptionFromStripe(stripeSub);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data?.object;
        const subId =
          typeof invoice?.subscription === "string"
            ? invoice.subscription
            : invoice?.subscription?.id;
        if (subId) {
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await updateSubscriptionFromStripe(stripeSub);
        }
        break;
      }
      default:
        break;
    }
  } finally {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() },
    });
  }

  return res.json({ received: true });
});

const buildVippsEventId = (event) => {
  if (!event) return "vipps:unknown";
  return (
    event.id ||
    event.eventId ||
    `${event.eventType}:${event.occurred || ""}:${event.agreementId || ""}:${event.chargeId || ""}`
  );
};

const verifyVippsSignature = (req, secret) => {
  const date = req.headers["x-ms-date"];
  const contentHashHeader = req.headers["x-ms-content-sha256"];
  const authorization = req.headers.authorization;
  const host = req.headers.host;

  if (!date || !contentHashHeader || !authorization || !host) {
    return { ok: false, error: "MISSING_VIPPS_SIGNATURE_HEADERS" };
  }

  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(req.body || "");
  const contentHash = crypto.createHash("sha256").update(rawBody).digest("base64");
  if (contentHash !== contentHashHeader) {
    return { ok: false, error: "VIPPS_CONTENT_HASH_MISMATCH" };
  }

  const signedString = `${req.method}\n${req.originalUrl}\n${date};${host};${contentHash}`;
  const signature = crypto.createHmac("sha256", secret).update(signedString).digest("base64");
  const expectedAuth = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;

  if (authorization !== expectedAuth) {
    return { ok: false, error: "VIPPS_SIGNATURE_INVALID" };
  }

  return { ok: true };
};

const updateVippsChargeStatus = async (event, status) => {
  const agreementId = event.agreementId;
  if (!agreementId) return;

  const chargeId = event.chargeId || event.orderId;
  try {
    if (chargeId) {
      await prisma.vippsCharge.updateMany({
        where: { agreementId, chargeId },
        data: { status },
      });
      return;
    }

    if (event.externalId) {
      console.warn(
        { agreementId, externalId: event.externalId },
        "Vipps webhook missing chargeId/orderId; falling back to externalId"
      );
      await prisma.vippsCharge.updateMany({
        where: { agreementId, externalId: event.externalId },
        data: { status },
      });
    }
  } catch (err) {
    console.error(
      { err, agreementId, chargeId, externalId: event.externalId },
      "Vipps charge status update failed"
    );
  }
};

router.post("/vipps", async (req, res) => {
  const allowUnsigned = process.env.VIPPS_WEBHOOK_ALLOW_UNSIGNED_TEST === "true";
  const secret = process.env.VIPPS_WEBHOOK_SECRET;

  if (!secret && !(allowUnsigned && process.env.NODE_ENV === "test")) {
    return res.status(500).json({ error: "VIPPS_WEBHOOK_SECRET_REQUIRED" });
  }

  if (secret) {
    const verification = verifyVippsSignature(req, secret);
    if (!verification.ok) {
      return res.status(400).json({ error: verification.error });
    }
  }

  let event;
  try {
    const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body || "");
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: "INVALID_VIPPS_PAYLOAD" });
  }

  const eventId = buildVippsEventId(event);
  let webhookEvent;
  try {
    webhookEvent = await prisma.webhookEvent.create({
      data: {
        provider: "VIPPS",
        eventId,
        payload: event,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.json({ received: true });
    }
    throw err;
  }

  try {
    const agreementId = event.agreementId;
    if (!agreementId) {
      return res.json({ received: true });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { vippsAgreementId: agreementId },
    });
    if (!subscription) {
      console.warn(
        { eventType: event.eventType, agreementId },
        "Vipps webhook subscription not found"
      );
      return res.json({ received: true });
    }

    switch (event.eventType) {
      case "recurring.agreement-activated.v1":
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { vippsAgreementStatus: "ACTIVE" },
        });
        break;
      case "recurring.agreement-rejected.v1":
      case "recurring.agreement-expired.v1":
      case "recurring.agreement-stopped.v1": {
        const actor = event.actor || event.actorId || event.actorType || null;
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "CANCELED",
            vippsAgreementStatus: "STOPPED",
            canceledAt: new Date(),
          },
        });
        console.info(
          {
            eventType: event.eventType,
            agreementId,
            subscriptionId: subscription.id,
            actor,
          },
          "Vipps agreement stopped"
        );
        break;
      }
      case "recurring.charge-captured.v1": {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            pastDueAt: null,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });
        await updateVippsChargeStatus(event, "CAPTURED");
        break;
      }
      case "recurring.charge-failed.v1":
      case "recurring.charge-creation-failed.v1":
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "PAST_DUE", pastDueAt: subscription.pastDueAt ?? new Date() },
        });
        await updateVippsChargeStatus(event, "FAILED");
        break;
      default:
        break;
    }
  } finally {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date() },
    });
  }

  return res.json({ received: true });
});

module.exports = router;
