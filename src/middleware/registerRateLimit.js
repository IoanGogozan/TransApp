const AppError = require("../utils/AppError");
const { createCounterStore, getClientIp } = require("../utils/rateLimitStore");

const windowMs = 15 * 60 * 1000;
const ipLimit = 20;

const attempts = createCounterStore({ windowMs, prefix: "rate-limit:register" });

const registerRateLimit = async (req, res, next) => {
  const ipKey = `ip:${getClientIp(req)}`;

  try {
    const ipCount = await attempts.get(ipKey);

    if (ipCount >= ipLimit) {
      return next(
        new AppError(429, "Too many registrations. Try again later.", "REGISTER_RATE_LIMITED"),
      );
    }

    res.on("finish", () => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      if (success) {
        void attempts.reset(ipKey);
      } else {
        void attempts.increment(ipKey);
      }
    });

    return next();
  } catch (error) {
    return next(error);
  }
};

registerRateLimit._resetRegisterRateLimit = () => {
  return attempts.clear();
};

module.exports = registerRateLimit;
