const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");

const getPublicCompany = asyncHandler(async (req, res) => {
  const companySlug = String(req.params.companySlug || "").trim().toLowerCase();
  if (!companySlug) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, slug: true, plan: true, defaultLanguage: true },
  });

  if (!company) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  res.json({ company });
});

module.exports = { getPublicCompany };
