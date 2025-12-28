const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");
const { hashPassword } = require("../utils/password");

const createUser = async ({ email, password, role, companyId }) => {
  if (role === "OWNER") {
    throw new AppError(400, "USER_ROLE_NOT_ALLOWED", "USER_ROLE_NOT_ALLOWED");
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    throw new AppError(409, "Email already registered", "AUTH_EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: { email, passwordHash, role, companyId },
    select: { id: true, email: true, role: true, companyId: true },
  });
};

const listUsersByCompany = async (companyId) => {
  return prisma.user.findMany({
    where: { companyId },
    select: { id: true, email: true, role: true, isActive: true, companyId: true },
    orderBy: { createdAt: "desc" },
  });
};

const updateUserPassword = async ({ companyId, userId, password }) => {
  const passwordHash = await hashPassword(password);
  const result = await prisma.user.updateMany({
    where: { id: userId, companyId },
    data: { passwordHash },
  });

  if (result.count === 0) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  return prisma.user.findFirst({
    where: { id: userId, companyId },
    select: { id: true, email: true, role: true, isActive: true, companyId: true },
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
    select: { id: true, email: true, role: true, isActive: true, companyId: true },
  });
};

module.exports = {
  createUser,
  listUsersByCompany,
  updateUserActive,
  updateUserPassword,
};
