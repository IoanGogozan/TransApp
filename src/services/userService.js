const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");
const { hashPassword } = require("../utils/password");
const { PASSWORD_TOO_SHORT_MESSAGE, isPasswordValid } = require("../utils/passwordPolicy");

const createUser = async ({ email, phone, username, password, role, companyId, mustChangePassword = false }) => {
  if (!password) {
    throw new AppError(400, "Password is required", "VALIDATION_ERROR");
  }
  if (!isPasswordValid(password)) {
    throw new AppError(400, PASSWORD_TOO_SHORT_MESSAGE, "VALIDATION_ERROR");
  }
  if (email) {
    const emailExists = await prisma.user.findFirst({ where: { companyId, email } });
    if (emailExists) {
      throw new AppError(409, "Email already registered", "AUTH_EMAIL_TAKEN");
    }
  }

  if (phone) {
    const phoneExists = await prisma.user.findFirst({ where: { companyId, phone } });
    if (phoneExists) {
      throw new AppError(409, "Phone already registered", "AUTH_PHONE_TAKEN");
    }
  }

  if (username) {
    const usernameExists = await prisma.user.findFirst({ where: { companyId, username } });
    if (usernameExists) {
      throw new AppError(409, "Username already registered", "AUTH_USERNAME_TAKEN");
    }
  }

  const passwordHash = await hashPassword(password);
  const mustChangePasswordFlag = role === "DRIVER" ? true : mustChangePassword;

  return prisma.user.create({
    data: { email, phone, username, passwordHash, role, companyId, mustChangePassword: mustChangePasswordFlag },
    select: { id: true, email: true, phone: true, username: true, role: true, companyId: true, mustChangePassword: true, tokenVersion: true },
  });
};

const listUsersByCompany = async (companyId, { includePlatformAdmins = false } = {}) => {
  return prisma.user.findMany({
    where: {
      companyId,
      ...(includePlatformAdmins ? {} : { role: { not: "PLATFORM_ADMIN" } }),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      role: true,
      isActive: true,
      companyId: true,
      mustChangePassword: true,
      tokenVersion: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const updateUserPassword = async ({ companyId, userId, password }) => {
  if (!isPasswordValid(password)) {
    throw new AppError(400, PASSWORD_TOO_SHORT_MESSAGE, "VALIDATION_ERROR");
  }

  const passwordHash = await hashPassword(password);
  const result = await prisma.user.updateMany({
    where: { id: userId, companyId },
    data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
  });

  if (result.count === 0) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  return prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, email: true, phone: true, username: true, role: true, isActive: true, companyId: true, mustChangePassword: true, tokenVersion: true },
  });
};

const updateUserActive = async ({ companyId, userId, active }) => {
  const result = await prisma.user.updateMany({
    where: { id: userId, companyId },
    data: { isActive: active },
  });

  if (result.count === 0) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  return prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, email: true, phone: true, username: true, role: true, isActive: true, companyId: true, mustChangePassword: true },
  });
};

module.exports = {
  createUser,
  listUsersByCompany,
  updateUserActive,
  updateUserPassword,
};
