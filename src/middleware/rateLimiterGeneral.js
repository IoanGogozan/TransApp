const defaultWindowMs = 60 * 1000;

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim() !== "") {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown-ip";
};

const createRateLimiter = ({ windowMs = defaultWindowMs, max = 60 } = {}) => {
  const hits = new Map();

  return (req, res, next) => {
    const key = getClientIp(req);
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.expiresAt <= now) {
      hits.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      return res.status(429).json({
        error: "Too many requests. Try again later.",
        code: "RATE_LIMITED",
      });
    }

    entry.count += 1;
    hits.set(key, entry);
    return next();
  };
};

module.exports = createRateLimiter;
