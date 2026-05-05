const AppError = require("../utils/AppError");
const {
  createCounterStore,
  getClientIp,
  normalizeIdentifier,
  normalizeRateLimitPart,
} = require("../utils/rateLimitStore");

const windowMs = 15 * 60 * 1000;
const ipLimit = 10;
const identifierLimit = 5;

const attempts = createCounterStore({ windowMs, prefix: "rate-limit:login" });

const getCompanyScope = (req) => {
  return normalizeRateLimitPart(req.params?.companySlug || req.body?.companySlug || "global");
};

const loginRateLimit = async (req, res, next) => {
  const companyScope = getCompanyScope(req);
  const ipKey = `ip:${companyScope}:${getClientIp(req)}`;
  const identifierRaw = req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? req.body?.username ?? "";
  const identifierKey = normalizeIdentifier(identifierRaw);
  const scopedIdentifierKey = identifierKey ? `identifier:${companyScope}:${identifierKey}` : "";

  try {
    const ipCount = await attempts.get(ipKey);
    const idCount = scopedIdentifierKey ? await attempts.get(scopedIdentifierKey) : 0;

    const limited = ipCount >= ipLimit || (scopedIdentifierKey && idCount >= identifierLimit);
    if (limited) {
      return next(
        new AppError(429, "Too many login attempts. Try again later.", "AUTH_RATE_LIMITED"),
      );
    }

    res.on("finish", () => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      const authFailed = res.statusCode === 401 || res.statusCode === 403;

      if (success) {
        void attempts.reset(ipKey);
        if (scopedIdentifierKey) void attempts.reset(scopedIdentifierKey);
      } else if (authFailed) {
        void attempts.increment(ipKey);
        if (scopedIdentifierKey) void attempts.increment(scopedIdentifierKey);
      }
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

loginRateLimit._resetLoginRateLimit = () => {
  return attempts.clear();
};

module.exports = loginRateLimit;
