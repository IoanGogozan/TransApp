const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const passwordResetService = require("../services/passwordResetService");

const forgotSchema = z.object({
  companySlug: z.string().trim().min(1),
  email: z.string().trim().email(),
});

const validateSchema = z.object({
  companySlug: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

const resetSchema = z.object({
  companySlug: z.string().trim().min(1),
  token: z.string().trim().min(1),
  password: z.string().min(8),
});

const handleValidation = (parsed) => {
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }
  return parsed.data;
};

const forgotPassword = asyncHandler(async (req, res) => {
  const data = handleValidation(forgotSchema.safeParse(req.body));
  await passwordResetService.requestPasswordReset(data);
  res.json({ ok: true, message: "If the account exists, we sent a link." });
});

const validateResetToken = asyncHandler(async (req, res) => {
  const data = handleValidation(validateSchema.safeParse(req.query));
  await passwordResetService.validatePasswordResetToken(data);
  res.json({ valid: true });
});

const resetPassword = asyncHandler(async (req, res) => {
  const data = handleValidation(resetSchema.safeParse(req.body));
  await passwordResetService.resetPasswordWithToken({
    companySlug: data.companySlug,
    token: data.token,
    newPassword: data.password,
  });
  res.json({ ok: true });
});

module.exports = {
  forgotPassword,
  validateResetToken,
  resetPassword,
};
