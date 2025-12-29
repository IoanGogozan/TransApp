const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const userService = require("../services/userService");

const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: req.companyId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    throw new AppError(404, "User not found", "NOT_FOUND");
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
    company: user.company,
  });
});

const updateMyPasswordSchema = z.object({
  password: z.string().min(4),
});

const updateMyPassword = asyncHandler(async (req, res) => {
  const parsed = updateMyPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const minLength = req.user.role === "DRIVER" ? 4 : 8;
  if (parsed.data.password.length < minLength) {
    const formattedError = { password: { _errors: [`Password must be at least ${minLength} characters`] } };
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", formattedError);
  }

  const user = await userService.updateUserPassword({
    companyId: req.companyId,
    userId: req.user.id,
    password: parsed.data.password,
  });

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

module.exports = { getMe, updateMyPassword };
