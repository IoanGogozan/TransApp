const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const authService = require("../services/authService");

const registerSchema = z.object({
  companyName: z.string().trim().min(1, "companyName is required"),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "identifier is required"),
  password: z.string().min(1, "Password is required"),
});

const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const result = await authService.registerOwner(parsed.data);
  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const result = await authService.login(parsed.data);
  res.json(result);
});

const loginWithCompanySlug = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const companySlug = String(req.params.companySlug || "").trim();
  if (!companySlug) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const result = await authService.loginByCompanySlug({
    companySlug,
    identifier: parsed.data.identifier,
    password: parsed.data.password,
  });

  res.json(result);
});

module.exports = {
  register,
  login,
  loginWithCompanySlug,
};
