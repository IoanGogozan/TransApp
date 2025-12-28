const AppError = require("../utils/AppError");
const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  const isAppError = err instanceof AppError;
  const message = statusCode >= 500 && !isAppError ? "Internal server error" : err.message || "Error";
  const code = err.code || (isAppError ? "APP_ERROR" : "INTERNAL_ERROR");

  const body = { error: { code, message } };

  if (err.details) {
    body.error.details = err.details;
  }

  if (!isAppError && statusCode >= 500) {
    // Log unexpected errors for operators to investigate.
    logger.error({ err, reqId: req.id }, "Unhandled error");
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
