const windowMs = 15 * 60 * 1000;
const ipLimit = 20;

const ipAttempts = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim() !== "") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown-ip";
};

const increment = (map, key) => {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || existing.expiresAt <= now) {
    map.set(key, { count: 1, expiresAt: now + windowMs });
    return 1;
  }
  const nextCount = existing.count + 1;
  map.set(key, { count: nextCount, expiresAt: existing.expiresAt });
  return nextCount;
};

const reset = (map, key) => {
  map.delete(key);
};

const registerRateLimit = (req, res, next) => {
  const ipKey = getClientIp(req);
  const now = Date.now();
  const current = ipAttempts.get(ipKey);
  const ipCount = !current || current.expiresAt <= now ? 0 : current.count;

  if (ipCount >= ipLimit) {
    res.status(429).json({ error: "Too many registrations. Try again later.", code: "REGISTER_RATE_LIMITED" });
    return;
  }

  res.on("finish", () => {
    const success = res.statusCode >= 200 && res.statusCode < 300;
    if (success) {
      reset(ipAttempts, ipKey);
    } else {
      increment(ipAttempts, ipKey);
    }
  });

  next();
};

registerRateLimit._resetRegisterRateLimit = () => {
  ipAttempts.clear();
};

module.exports = registerRateLimit;
