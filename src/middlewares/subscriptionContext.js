const prisma = require("../config/prismaClient");

const subscriptionContext = async (req, res, next) => {
  const companyId = req.user?.companyId ?? req.company?.id ?? req.companyId;
  if (!companyId) {
    return next();
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { companyId: Number(companyId) },
    });
    if (subscription) {
      req.subscription = subscription;
      return next();
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
      const created = await prisma.subscription.create({
        data: {
          companyId: Number(companyId),
          plan: "BASIC",
          status: "TRIALING",
          trialStart: now,
          trialEnd,
        },
      });
      req.subscription = created;
      return next();
    } catch (createErr) {
      if (createErr && createErr.code === "P2002") {
        const existing = await prisma.subscription.findUnique({
          where: { companyId: Number(companyId) },
        });
        req.subscription = existing || null;
        return next();
      }
      throw createErr;
    }
  } catch (err) {
    return next(err);
  }
};

module.exports = subscriptionContext;
