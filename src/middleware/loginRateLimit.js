const windowMs = 15 * 60 * 1000;
const ipLimit = 10;
const identifierLimit = 5;

const ipAttempts = new Map();
const identifierAttempts = new Map();

const normalizeIdentifier = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw.toLowerCase();

  const phoneLike = /^[+]?[\d\s\-()]+$/.test(raw);
  if (phoneLike) {
    const hasPlus = raw.trim().startsWith("+");
    const digits = raw.replace(/[^\d]/g, "");
    return (hasPlus ? "+" : "") + digits;
  }

  return raw.toLowerCase();
};

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

const loginRateLimit = (req, res, next) => {
  const ipKey = getClientIp(req);
  const identifierRaw = req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? req.body?.username ?? "";
  const identifierKey = normalizeIdentifier(identifierRaw);

  const now = Date.now();
  const currentIp = ipAttempts.get(ipKey);
  const ipCount = !currentIp || currentIp.expiresAt <= now ? 0 : currentIp.count;

  let idCount = 0;
  if (identifierKey) {
    const currentId = identifierAttempts.get(identifierKey);
    idCount = !currentId || currentId.expiresAt <= now ? 0 : currentId.count;
  }

  const limited = ipCount >= ipLimit || (identifierKey && idCount >= identifierLimit);
  if (limited) {
    res.status(429).json({ error: "Too many login attempts. Try again later.", code: "AUTH_RATE_LIMITED" });
    return;
  }

  res.on("finish", () => {
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const authFailed = res.statusCode === 401 || res.statusCode === 403;

    if (success) {
      reset(ipAttempts, ipKey);
      if (identifierKey) reset(identifierAttempts, identifierKey);
    } else if (authFailed) {
      increment(ipAttempts, ipKey);
      if (identifierKey) increment(identifierAttempts, identifierKey);
    }
  });

  next();
};

loginRateLimit._resetLoginRateLimit = () => {
  ipAttempts.clear();
  identifierAttempts.clear();
};

module.exports = loginRateLimit;
