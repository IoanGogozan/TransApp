const cron = require("node-cron");
const crypto = require("crypto");
const prisma = require("../config/prismaClient");
const logger = require("../config/logger");
const { vippsRequest } = require("../lib/vippsClient");

const DAY_MS = 24 * 60 * 60 * 1000;
const LEAD_DAYS = 2;

const hasVippsConfig = () => (
  Boolean(process.env.VIPPS_CLIENT_ID) &&
  Boolean(process.env.VIPPS_CLIENT_SECRET) &&
  Boolean(process.env.VIPPS_SUBSCRIPTION_KEY) &&
  Boolean(process.env.VIPPS_MSN)
);

const getVippsAmountForPlan = (plan) => {
  const map = {
    BASIC: process.env.VIPPS_PRICE_BASIC_ORE,
    MEDIUM: process.env.VIPPS_PRICE_MEDIUM_ORE,
    PRO: process.env.VIPPS_PRICE_PRO_ORE,
  };
  const amount = Number.parseInt(map[plan], 10);
  return Number.isInteger(amount) && amount > 0 ? amount : null;
};

const getVippsCurrency = () => {
  const currency = process.env.VIPPS_CURRENCY || "NOK";
  return currency;
};

const formatDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const formatDueDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeLocalDate = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const reserveCharge = async ({
  subscriptionId,
  agreementId,
  externalId,
  chargeId,
  dueDate,
  amount,
  currency,
}) => {
  try {
    return await prisma.vippsCharge.create({
      data: {
        subscriptionId,
        agreementId,
        externalId,
        chargeId,
        dueDate,
        amount,
        currency,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return null;
    }
    throw err;
  }
};

const createVippsCharge = async ({ subscription, baseDueDate }) => {
  const amount = getVippsAmountForPlan(subscription.plan);
  if (!amount) {
    logger.warn(
      { subscriptionId: subscription.id, plan: subscription.plan },
      "Vipps amount not configured for plan"
    );
    return;
  }

  const minDueDate = new Date(Date.now() + LEAD_DAYS * DAY_MS);
  const dueDate = normalizeLocalDate(
    baseDueDate.getTime() < minDueDate.getTime() ? minDueDate : baseDueDate
  );

  const dateKey = formatDateKey(baseDueDate);
  const externalId = `sub_${subscription.id}_${dateKey}`;
  const orderId = crypto.randomUUID();
  const currency = getVippsCurrency();

  const reserved = await reserveCharge({
    subscriptionId: subscription.id,
    agreementId: subscription.vippsAgreementId,
    externalId,
    chargeId: orderId,
    dueDate,
    amount,
    currency,
  });

  if (!reserved) return;

  try {
    const payload = {
      amount,
      description: `TRANSAPP ${subscription.plan} - monthly subscription`,
      due: formatDueDate(dueDate),
      retryDays: 14,
      transactionType: "DIRECT_CAPTURE",
      orderId,
      currency,
    };

    await vippsRequest(
      `/recurring/v3/agreements/${subscription.vippsAgreementId}/charges`,
      { method: "POST", body: payload }
    );

    await prisma.vippsCharge.update({
      where: { id: reserved.id },
      data: {
        status: "CREATED",
      },
    });
  } catch (err) {
    await prisma.vippsCharge.update({
      where: { id: reserved.id },
      data: { status: "FAILED" },
    });
    logger.error(
      {
        err,
        subscriptionId: subscription.id,
        agreementId: subscription.vippsAgreementId,
        orderId,
      },
      "Vipps charge creation failed"
    );
  }
};

const runVippsChargeScheduler = async () => {
  if (process.env.NODE_ENV === "test") return;
  if (!hasVippsConfig()) {
    logger.warn("Vipps charge scheduler skipped: missing configuration");
    return;
  }

  const now = new Date();
  const soon = new Date(now.getTime() + LEAD_DAYS * DAY_MS);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      vippsAgreementId: { not: null },
      vippsAgreementStatus: "ACTIVE",
      status: { in: ["TRIALING", "ACTIVE"] },
    },
  });

  for (const subscription of subscriptions) {
    if (subscription.status === "TRIALING" && now < subscription.trialEnd) {
      continue;
    }

    const baseDueDate =
      subscription.status === "TRIALING"
        ? subscription.trialEnd
        : subscription.currentPeriodEnd;

    if (!baseDueDate) continue;

    if (baseDueDate.getTime() > soon.getTime()) {
      continue;
    }

    try {
      await createVippsCharge({ subscription, baseDueDate });
    } catch (err) {
      logger.error({ err, subscriptionId: subscription.id }, "Vipps scheduler error");
    }
  }
};

const startVippsChargeScheduler = () => {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule("0 3 * * *", () => {
    runVippsChargeScheduler().catch((err) => {
      logger.error({ err }, "Vipps charge scheduler failed");
    });
  });
};

module.exports = { startVippsChargeScheduler };
