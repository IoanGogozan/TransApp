const { createCounterStore, getClientIp, normalizeRateLimitPart } = require("../utils/rateLimitStore");

const defaultWindowMs = 60 * 1000;

const createRateLimiter = ({ windowMs = defaultWindowMs, max = 60, prefix = "general", store } = {}) => {
  const counterStore = store || createCounterStore({ windowMs, prefix: `rate-limit:${prefix}` });

  const getKey = (req) => {
    const parts = [`ip:${getClientIp(req)}`];
    if (req.params?.companySlug) {
      parts.push(`company:${normalizeRateLimitPart(req.params.companySlug)}`);
    }
    if (req.user?.id) {
      parts.push(`user:${normalizeRateLimitPart(req.user.id)}`);
    }
    return parts.join(":");
  };

  const middleware = async (req, res, next) => {
    const key = getKey(req);

    try {
      const count = await counterStore.get(key);

      if (count >= max) {
        return res.status(429).json({
          error: "Too many requests. Try again later.",
          code: "RATE_LIMITED",
        });
      }

      await counterStore.increment(key);
      return next();
    } catch (error) {
      return next(error);
    }
  };

  middleware._resetRateLimit = () => counterStore.clear();
  return middleware;
};

module.exports = createRateLimiter;
