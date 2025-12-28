const AppError = require("../utils/AppError");

const companyContext = (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return next(new AppError(400, "Company context is missing", "COMPANY_CONTEXT_MISSING"));
  }

  req.companyId = req.user.companyId;
  return next();
};

module.exports = companyContext;
