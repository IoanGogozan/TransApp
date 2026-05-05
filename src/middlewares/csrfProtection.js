const AppError = require("../utils/AppError");
const { getAuthCookie } = require("../utils/authCookie");
const { validateCsrfRequest } = require("../utils/csrfToken");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const requireValidCsrfToken = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  if (!validateCsrfRequest(req)) {
    return next(new AppError(403, "Invalid CSRF token", "CSRF_INVALID_TOKEN"));
  }

  return next();
};

const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.authSource !== "cookie") return next();
  return requireValidCsrfToken(req, res, next);
};

const csrfProtectionForAuthCookie = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!getAuthCookie(req)) return next();
  return requireValidCsrfToken(req, res, next);
};

module.exports = {
  csrfProtection,
  csrfProtectionForAuthCookie,
};
