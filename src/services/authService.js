const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");
const { hashPassword, comparePassword } = require("../utils/password");
const { signToken } = require("../utils/jwt");

const registerOwner = async ({ companyName, email, password }) => {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    throw new AppError(409, "Email already registered", "AUTH_EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "OWNER",
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    return { company, user };
  });

  const token = signToken({
    userId: result.user.id,
    companyId: result.user.companyId,
    role: result.user.role,
  });

  return { token, user: result.user, company: { id: result.company.id, name: result.company.name } };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      companyId: true,
      isActive: true,
      company: { select: { id: true, name: true } },
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
  });

  return {
    token,
    user: { id: user.id, email: user.email, role: user.role },
    company: user.company,
  };
};

module.exports = {
  registerOwner,
  login,
};
