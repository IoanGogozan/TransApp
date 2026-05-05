const logger = require("../config/logger");

const sensitiveQueryParams = new Set(["token", "password", "secret", "clientsecret", "code", "refreshtoken"]);

const sanitizeUrl = (originalUrl) => {
  if (!originalUrl) {
    return originalUrl;
  }

  try {
    const url = new URL(originalUrl, "http://local");

    for (const key of Array.from(url.searchParams.keys())) {
      if (sensitiveQueryParams.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }

    return `${url.pathname}${url.search}`.replaceAll("%5BREDACTED%5D", "[REDACTED]");
  } catch {
    return "[INVALID_URL]";
  }
};

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6;

    logger.info(
      {
        reqId: req.id,
        method: req.method,
        path: sanitizeUrl(req.originalUrl || req.url),
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      "request"
    );
  });

  next();
};

requestLogger.sanitizeUrl = sanitizeUrl;

module.exports = requestLogger;
