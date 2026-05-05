const { createClient } = require("redis");

const defaultWindowMs = 60 * 1000;

const getClientIp = (req) => req.ip || "unknown-ip";

const normalizeRateLimitPart = (value) => {
  const normalized = (value || "").toString().trim().toLowerCase();
  return normalized || "global";
};

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

const createMemoryCounterStore = ({ windowMs = defaultWindowMs } = {}) => {
  const hits = new Map();

  const getEntry = (key) => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.expiresAt <= now) {
      hits.delete(key);
      return { count: 0, expiresAt: now + windowMs };
    }
    return entry;
  };

  return {
    async get(key) {
      return getEntry(key).count;
    },
    async increment(key) {
      const now = Date.now();
      const entry = getEntry(key);
      const expiresAt = entry.count === 0 ? now + windowMs : entry.expiresAt;
      const count = entry.count + 1;
      hits.set(key, { count, expiresAt });
      return count;
    },
    async reset(key) {
      hits.delete(key);
    },
    async clear() {
      hits.clear();
    },
  };
};

const createRedisCounterStore = ({ prefix = "rate-limit", redisUrl, windowMs = defaultWindowMs } = {}) => {
  let client;
  let connectPromise;

  const getClient = async () => {
    if (!client) {
      client = createClient({ url: redisUrl });
      client.on("error", () => {});
    }
    if (!client.isOpen) {
      connectPromise = connectPromise || client.connect();
      await connectPromise;
    }
    return client;
  };

  const redisKey = (key) => `${prefix}:${key}`;
  const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  return {
    async get(key) {
      const redis = await getClient();
      const value = await redis.get(redisKey(key));
      return Number(value || 0);
    },
    async increment(key) {
      const redis = await getClient();
      const keyName = redisKey(key);
      const count = await redis.incr(keyName);
      if (count === 1) {
        await redis.expire(keyName, ttlSeconds);
      }
      return count;
    },
    async reset(key) {
      const redis = await getClient();
      await redis.del(redisKey(key));
    },
    async clear() {},
  };
};

const createCounterStore = (options = {}) => {
  const redisUrl = options.redisUrl || process.env.REDIS_URL;
  if (redisUrl) {
    return createRedisCounterStore({ ...options, redisUrl });
  }
  return createMemoryCounterStore(options);
};

module.exports = {
  createCounterStore,
  createMemoryCounterStore,
  getClientIp,
  normalizeIdentifier,
  normalizeRateLimitPart,
};
