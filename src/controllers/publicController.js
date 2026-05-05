const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const companyService = require("../services/companyService");
const prisma = require("../config/prismaClient");
const { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } = require("../utils/passwordPolicy");

const slugRegex = /^[a-z0-9-]{3,40}$/;

const registerSchema = z.object({
  companyName: z.string().trim().min(1),
  companySlug: z.string().trim().toLowerCase().regex(slugRegex, "Invalid slug"),
  adminEmail: z.string().trim().email(),
  adminPassword: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
});

const registerCompany = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const company = await companyService.createCompanyWithAdmin(parsed.data);
  res.status(201).json({ company });
});

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

module.exports = { registerCompany, getPublicCompany };
