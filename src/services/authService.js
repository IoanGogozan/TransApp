const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");
const { generateUniqueSlug } = require("../utils/slugify");
const env = require("../config/env");
const logger = require("../config/logger");
const { sendEmail } = require("./emailService");

const normalizeEmail = (s) => s.trim().toLowerCase();
const normalizePhone = (s) => {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
};
const normalizeUsername = (s) => s.trim().toLowerCase();

const registerOwner = async ({ companyName, email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(companyName, async (candidate) => {
      const existing = await tx.company.findUnique({ where: { slug: candidate }, select: { id: true } });
      return Boolean(existing);
    });

    const company = await tx.company.create({
      data: {
        name: companyName,
        slug,
      },
    });

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await tx.subscription.create({
      data: {
        companyId: company.id,
        plan: "BASIC",
        status: "TRIALING",
        trialStart: now,
        trialEnd,
      },
    });

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "ADMIN",
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        tokenVersion: true,
      },
    });

    return { company, user };
  });

  const loginLink = `${env.appPublicUrl}/c/${result.company.slug}/login`;
  const subject = "Your TransApp workspace details";
  const text = [
    `Company: ${result.company.name}`,
    `Company slug: ${result.company.slug}`,
    `Admin email: ${normalizedEmail}`,
    `Sign in: ${loginLink}`,
  ].join("\n");

  try {
    await sendEmail({ to: normalizedEmail, subject, text });
  } catch (e) {
    logger.warn({ err: e?.message, companySlug: result.company.slug }, "Registration email failed (ignored)");
  }

  const token = signToken({
    userId: result.user.id,
    companyId: result.user.companyId,
    role: result.user.role,
    tokenVersion: result.user.tokenVersion,
  });

  return { token, user: result.user, company: { id: result.company.id, name: result.company.name } };
};

const login = async ({ identifier, password }) => {
  throw new AppError(400, "Tenant-aware login is required", "TENANT_REQUIRED");
};

const loginByCompanySlug = async ({ companySlug, identifier, password }) => {
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, slug: true, plan: true },
  });

  if (!company) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  const raw = identifier.trim();
  const phoneLike = /^[+]?[\d\s\-()]+$/.test(raw);

  const user = await prisma.user.findFirst({
    where: {
      companyId: company.id,
      ...(raw.includes("@")
        ? { email: normalizeEmail(raw) }
        : phoneLike
        ? { phone: normalizePhone(raw) }
        : { username: normalizeUsername(raw) }),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      passwordHash: true,
      role: true,
      companyId: true,
      isActive: true,
      tokenVersion: true,
    },
  });

  if (!user) {
    throw new AppError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw new AppError(403, "User is disabled", "AUTH_USER_DISABLED");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
  }

  const token = signToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  return {
    token,
    user: { id: user.id, email: user.email, phone: user.phone, username: user.username, role: user.role },
    company,
  };
};

module.exports = {
  registerOwner,
  login,
  loginByCompanySlug,
};
