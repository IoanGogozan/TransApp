const windowMs = 15 * 60 * 1000;
const ipLimit = 10;
const emailLimit = 5;

const ipAttempts = new Map();
const emailAttempts = new Map();

const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();

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

const getCount = (map, key) => {
  const now = Date.now();
  const existing = map.get(key);
  if (!existing || existing.expiresAt <= now) {
    return 0;
  }
  return existing.count;
};

const forgotPasswordRateLimit = (req, res, next) => {
  const ipKey = getClientIp(req);
  const emailKey = normalizeEmail(req.body?.email);

  const ipCount = getCount(ipAttempts, ipKey);
  const emailCount = emailKey ? getCount(emailAttempts, emailKey) : 0;

  const limited = ipCount >= ipLimit || (emailKey && emailCount >= emailLimit);
  if (limited) {
    res.status(429).json({
      error: { code: "AUTH_RATE_LIMITED", message: "Too many requests. Try again later." },
    });
    return;
  }

  increment(ipAttempts, ipKey);
  if (emailKey) increment(emailAttempts, emailKey);

  next();
};

module.exports = forgotPasswordRateLimit;
