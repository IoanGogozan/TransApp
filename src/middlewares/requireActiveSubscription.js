const AppError = require("../utils/AppError");

const requireActiveSubscription = (req, res, next) => {
  const sub = req.subscription;
  if (!sub) {
    return next(
      new AppError(402, "Subscription inactive", "SUBSCRIPTION_INACTIVE", { status: null }),
    );
  }

  const GRACE_DAYS = 7;
  const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;

  if (sub.status === "ACTIVE") {
    return next();
  }

  if (sub.status === "TRIALING") {
    const trialEnd = new Date(sub.trialEnd);
    if (Date.now() < trialEnd.getTime()) {
      return next();
    }
  }

  if (sub.status === "PAST_DUE") {
    if (!sub.pastDueAt) {
      return next(
        new AppError(402, "Subscription inactive", "SUBSCRIPTION_INACTIVE", {
          status: sub.status ?? null,
        }),
      );
    }
    const pastDueAt = new Date(sub.pastDueAt);
    if (Date.now() < pastDueAt.getTime() + graceMs) {
      return next();
    }
    return next(
      new AppError(402, "Subscription inactive", "SUBSCRIPTION_INACTIVE", {
        status: sub.status ?? null,
      }),
    );
  }

  return next(
    new AppError(402, "Subscription inactive", "SUBSCRIPTION_INACTIVE", {
      status: sub.status ?? null,
    }),
  );
};

module.exports = requireActiveSubscription;
