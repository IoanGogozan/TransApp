const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");

const slugRegex = /^[a-z0-9-]{3,40}$/;

const getPublicCompany = asyncHandler(async (req, res) => {
  const companySlug = String(req.params.companySlug || "").trim().toLowerCase();
  if (!companySlug || !slugRegex.test(companySlug)) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { name: true, slug: true, defaultLanguage: true },
  });

  if (!company) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  res.json({ company });
});

module.exports = { getPublicCompany };
