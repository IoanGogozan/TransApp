const logger = require("../config/logger");

const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs) / 1e6;

    logger.info(
      {
        reqId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      },
      "request"
    );
  });

  next();
};

module.exports = requestLogger;
