const AppError = require("../utils/AppError");

const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) {
    return next(new AppError(403, "Forbidden", "FORBIDDEN"));
  }
  return next();
};

module.exports = requireRole;
