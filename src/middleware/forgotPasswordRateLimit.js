const {
  createCounterStore,
  getClientIp,
  normalizeRateLimitPart,
} = require("../utils/rateLimitStore");

const windowMs = 15 * 60 * 1000;
const ipLimit = 10;
const emailLimit = 5;

const attempts = createCounterStore({ windowMs, prefix: "rate-limit:forgot-password" });

const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();

const getCompanyScope = (req) => {
  return normalizeRateLimitPart(req.params?.companySlug || req.body?.companySlug || "global");
};

const forgotPasswordRateLimit = async (req, res, next) => {
  const companyScope = getCompanyScope(req);
  const ipKey = `ip:${companyScope}:${getClientIp(req)}`;
  const emailKey = normalizeEmail(req.body?.email);
  const scopedEmailKey = emailKey ? `email:${companyScope}:${emailKey}` : "";

  try {
    const ipCount = await attempts.get(ipKey);
    const emailCount = scopedEmailKey ? await attempts.get(scopedEmailKey) : 0;

    const limited = ipCount >= ipLimit || (scopedEmailKey && emailCount >= emailLimit);
    if (limited) {
      res.status(429).json({
        error: { code: "AUTH_RATE_LIMITED", message: "Too many requests. Try again later." },
      });
      return;
    }

    await attempts.increment(ipKey);
    if (scopedEmailKey) await attempts.increment(scopedEmailKey);

    next();
  } catch (error) {
    next(error);
  }
};

forgotPasswordRateLimit._resetForgotPasswordRateLimit = () => {
  return attempts.clear();
};

module.exports = forgotPasswordRateLimit;
