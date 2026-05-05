const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const authService = require("../services/authService");
const { clearAuthCookie, setAuthCookie } = require("../utils/authCookie");
const { clearCsrfCookie, setCsrfCookie } = require("../utils/csrfToken");
const { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } = require("../utils/passwordPolicy");

const registerSchema = z.object({
  companyName: z.string().trim().min(1, "companyName is required"),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "identifier is required"),
  password: z.string().min(1, "Password is required"),
});

const register = asyncHandler(async (req, res) => {
  throw new AppError(
    410,
    "Company registration moved to /api/v1/public/register",
    "AUTH_REGISTER_MOVED",
  );
});

const login = asyncHandler(async (req, res) => {
  throw new AppError(
    400,
    "Tenant-aware login is required",
    "TENANT_REQUIRED",
  );
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

  setAuthCookie(res, result.token);
  setCsrfCookie(res);

  if (process.env.NODE_ENV === "test") {
    res.json(result);
    return;
  }

  const { token, ...safeResult } = result;
  res.json(safeResult);
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  clearCsrfCookie(res);
  res.json({ ok: true });
});

module.exports = {
  register,
  login,
  loginWithCompanySlug,
  logout,
};
