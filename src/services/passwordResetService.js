const crypto = require("crypto");
const prisma = require("../config/prismaClient");
const env = require("../config/env");
const AppError = require("../utils/AppError");
const { hashPassword } = require("../utils/password");
const { sendEmail } = require("./emailService");

const TOKEN_BYTES = 32;
const TOKEN_TTL_MINUTES = 60;

const normalizeEmail = (value) => (value || "").trim().toLowerCase();
const normalizeSlug = (value) => (value || "").trim().toLowerCase();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const requestPasswordReset = async ({ companySlug, email }) => {
  const normalizedSlug = normalizeSlug(companySlug);
  const normalizedEmail = normalizeEmail(email);

  const company = await prisma.company.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true, slug: true, name: true },
  });

  if (!company) {
    return { ok: true };
  }

  const user = await prisma.user.findFirst({
    where: {
      companyId: company.id,
      email: normalizedEmail,
      role: { in: ["ADMIN", "PLATFORM_ADMIN"] },
      isActive: true,
    },
    select: { id: true, email: true },
  });

  if (!user) {
    return { ok: true };
  }

  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      companyId: company.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetLink = `${env.appPublicUrl}/reset-password?token=${rawToken}&companySlug=${company.slug}`;

  if (user.email) {
    const text = [
      "Hello,",
      "",
      "Use the link below to reset your TransApp password:",
      resetLink,
      "",
      "This link expires in 60 minutes.",
      "If you did not request this, you can ignore this email.",
    ].join("\n");

    await sendEmail({
      to: user.email,
      subject: "Reset your TransApp password",
      text,
    });
  }

  return { ok: true };
};

const validatePasswordResetToken = async ({ companySlug, token }) => {
  const normalizedSlug = normalizeSlug(companySlug);

  if (!token || !token.trim()) {
    throw new AppError(400, "Invalid token", "RESET_TOKEN_INVALID");
  }

  const company = await prisma.company.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!company) {
    throw new AppError(400, "Invalid token", "RESET_TOKEN_INVALID");
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      companyId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record) {
    throw new AppError(400, "Invalid or expired token", "RESET_TOKEN_INVALID");
  }

  if (record.usedAt) {
    throw new AppError(400, "Token already used", "RESET_TOKEN_USED");
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(400, "Token expired", "RESET_TOKEN_EXPIRED");
  }

  if (record.companyId !== company.id) {
    throw new AppError(400, "Invalid or expired token", "RESET_TOKEN_INVALID");
  }

  return { valid: true };
};

const resetPasswordWithToken = async ({ companySlug, token, newPassword }) => {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters", "PASSWORD_TOO_SHORT");
  }

  const normalizedSlug = normalizeSlug(companySlug);

  if (!token || !token.trim()) {
    throw new AppError(400, "Invalid token", "RESET_TOKEN_INVALID");
  }

  const company = await prisma.company.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!company) {
    throw new AppError(400, "Invalid token", "RESET_TOKEN_INVALID");
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      companyId: true,
      expiresAt: true,
      usedAt: true,
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
          companyId: true,
        },
      },
    },
  });

  if (!record) {
    throw new AppError(400, "Invalid or expired token", "RESET_TOKEN_INVALID");
  }

  if (record.usedAt) {
    throw new AppError(400, "Token already used", "RESET_TOKEN_USED");
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(400, "Token expired", "RESET_TOKEN_EXPIRED");
  }

  if (record.companyId !== company.id) {
    throw new AppError(400, "Invalid or expired token", "RESET_TOKEN_INVALID");
  }

  if (!record.user || !["ADMIN", "PLATFORM_ADMIN"].includes(record.user.role)) {
    throw new AppError(403, "Not allowed", "RESET_NOT_ALLOWED");
  }

  const now = new Date();
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.deleteMany({
      where: {
        userId: record.user.id,
        usedAt: null,
        expiresAt: { gt: now },
        id: { not: record.id },
      },
    });
  });

  return { ok: true };
};

module.exports = {
  requestPasswordReset,
  validatePasswordResetToken,
  resetPasswordWithToken,
};
