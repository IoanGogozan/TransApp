const { z } = require("zod");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/userService");

const createSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "DRIVER"]).optional().default("DRIVER"),
});

const createUser = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const user = await userService.createUser({
    ...parsed.data,
    companyId: req.companyId,
  });

  res.status(201).json({ user });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsersByCompany(req.companyId);
  res.json({ users });
});

const updateActiveSchema = z.object({
  active: z.boolean(),
});

const updateUserActive = asyncHandler(async (req, res) => {
  const body = updateActiveSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    throw new AppError(400, "Invalid user id", "VALIDATION_ERROR");
  }

  const user = await userService.updateUserActive({
    companyId: req.companyId,
    userId,
    active: body.data.active,
  });

  res.json({ user });
});

const updatePasswordSchema = z.object({
  password: z.string().min(8),
});

const updateUserPassword = asyncHandler(async (req, res) => {
  const body = updatePasswordSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    throw new AppError(400, "Invalid user id", "VALIDATION_ERROR");
  }

  const user = await userService.updateUserPassword({
    companyId: req.companyId,
    userId,
    password: body.data.password,
  });

  res.json({ user });
});

module.exports = { createUser, listUsers, updateUserActive, updateUserPassword };
