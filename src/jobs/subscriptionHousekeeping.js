const cron = require("node-cron");
const prisma = require("../config/prismaClient");

const GRACE_DAYS = 7;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

const runSubscriptionHousekeeping = async () => {
  if (process.env.NODE_ENV === "test") return;

  const now = new Date();
  const pastDueCutoff = new Date(now.getTime() - GRACE_MS);

  const pastDueResult = await prisma.subscription.updateMany({
    where: {
      status: "PAST_DUE",
      pastDueAt: { lte: pastDueCutoff },
    },
    data: {
      status: "EXPIRED",
    },
  });

  const trialResult = await prisma.subscription.updateMany({
    where: {
      status: "TRIALING",
      trialEnd: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  console.info(
    `[subscriptionHousekeeping] expired past due: ${pastDueResult.count}, expired trial: ${trialResult.count}`,
  );
};

const startSubscriptionHousekeeping = () => {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule(
    "10 3 * * *",
    () => {
      runSubscriptionHousekeeping().catch((err) => {
        console.info("[subscriptionHousekeeping] failed", err);
      });
    },
    { timezone: "Europe/Oslo" },
  );
};

module.exports = { startSubscriptionHousekeeping, runSubscriptionHousekeeping };
