const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");

const companyContext = async (req, res, next) => {
  if (!req.user || !req.user.companyId) {
    return next(new AppError(400, "Company context is missing", "COMPANY_CONTEXT_MISSING"));
  }

  try {
    const companySlug = req.params.companySlug;

    if (!companySlug) {
      req.companyId = req.user.companyId;
      return next();
    }

    const company = await prisma.company.findUnique({
      where: { slug: companySlug },
      select: { id: true, slug: true, name: true },
    });

    if (!company) {
      return next(new AppError(404, "Company not found", "COMPANY_NOT_FOUND"));
    }

    if (company.id !== req.user.companyId) {
      return next(new AppError(403, "Company context mismatch", "COMPANY_CONTEXT_MISMATCH"));
    }

    req.companyId = company.id;
    req.companySlug = company.slug;
    req.company = company;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = companyContext;
