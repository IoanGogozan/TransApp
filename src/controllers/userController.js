const { z } = require("zod");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/userService");
const prisma = require("../config/prismaClient");
const { getCompanyLimits } = require("../config/planLimits");
const { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE, isPasswordValid } = require("../utils/passwordPolicy");

const normalizeEmail = (s) => s.trim().toLowerCase();
const normalizePhone = (s) => {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
};
const normalizeUsername = (s) => s.trim().toLowerCase();

const createSchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "DRIVER", "PLATFORM_ADMIN"]).optional().default("DRIVER"),
});

const createUser = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const data = parsed.data;

  if (data.role === "PLATFORM_ADMIN" && req.user.role !== "PLATFORM_ADMIN") {
    throw new AppError(
      403,
      "Only platform admins can create platform admins",
      "USER_CANNOT_CREATE_PLATFORM_ADMIN",
    );
  }

  const email = data.email?.trim() ? normalizeEmail(data.email) : undefined;
  const username = data.username?.trim() ? normalizeUsername(data.username) : undefined;
  const normalizedPhone = data.phone?.trim() ? normalizePhone(data.phone) : undefined;
  let phone = normalizedPhone;

  const isAdminRole = data.role === "ADMIN" || data.role === "PLATFORM_ADMIN";

  if (isAdminRole) {
    if (!email) {
      throw new AppError(400, "Email is required for admin users", "VALIDATION_ERROR");
    }
  } else {
    if (!normalizedPhone) {
      throw new AppError(400, "Phone is required for driver users", "VALIDATION_ERROR");
    }
    phone = normalizedPhone;
  }

  if (!isPasswordValid(data.password)) {
    throw new AppError(400, PASSWORD_TOO_SHORT_MESSAGE, "VALIDATION_ERROR");
  }

  const company = await prisma.company.findUnique({
    where: { id: req.companyId },
    select: { plan: true },
  });

  const plan = company?.plan || "BASIC";
  const limits = getCompanyLimits(plan);

  const [adminCount, driverCount] = await Promise.all([
    prisma.user.count({
      where: { companyId: req.companyId, isActive: true, role: { in: ["ADMIN", "PLATFORM_ADMIN"] } },
    }),
    prisma.user.count({
      where: { companyId: req.companyId, isActive: true, role: "DRIVER" },
    }),
  ]);

  if (isAdminRole && adminCount >= limits.admins) {
    throw new AppError(409, "Plan limit reached", "PLAN_LIMIT_REACHED", {
      plan,
      role: data.role,
      limit: limits.admins,
      current: adminCount,
    });
  }

  if (data.role === "DRIVER" && driverCount >= limits.drivers) {
    throw new AppError(409, "Plan limit reached", "PLAN_LIMIT_REACHED", {
      plan,
      role: data.role,
      limit: limits.drivers,
      current: driverCount,
    });
  }

  const user = await userService.createUser({
    ...data,
    email,
    phone,
    username,
    password: data.password,
    mustChangePassword: data.role === "DRIVER",
    companyId: req.companyId,
  });

  res.status(201).json({ user });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsersByCompany(req.companyId);
  res.json({ users });
});

const enforceAdminUserGuards = async (req, targetUserId) => {
  if (req.user.id === targetUserId) {
    throw new AppError(403, "You can't modify your own account.", "USER_SELF_MODIFY_NOT_ALLOWED");
  }

  if (req.user.role === "ADMIN") {
    const target = await prisma.user.findFirst({
      where: { id: targetUserId, companyId: req.companyId },
      select: { role: true },
    });

    if (target?.role === "PLATFORM_ADMIN") {
      throw new AppError(403, "Admins can't modify owner accounts.", "USER_CANNOT_MODIFY_OWNER");
    }
  }
};

const updateActiveSchema = z.object({
  active: z.boolean(),
});

const updateUserActive = asyncHandler(async (req, res) => {
  const body = updateActiveSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(400, "Invalid user id", "VALIDATION_ERROR");
  }

  await enforceAdminUserGuards(req, userId);

  if (body.data.active === true) {
    const target = await prisma.user.findFirst({
      where: { id: userId, companyId: req.companyId },
      select: { id: true, role: true, isActive: true },
    });

    if (!target) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    if (!target.isActive) {
      const company = await prisma.company.findUnique({
        where: { id: req.companyId },
        select: { plan: true },
      });
      const plan = company?.plan || "BASIC";
      const limits = getCompanyLimits(plan);

      const [adminCount, driverCount] = await Promise.all([
        prisma.user.count({
          where: { companyId: req.companyId, isActive: true, role: { in: ["ADMIN", "PLATFORM_ADMIN"] } },
        }),
        prisma.user.count({
          where: { companyId: req.companyId, isActive: true, role: "DRIVER" },
        }),
      ]);

      const isAdminRole = ["ADMIN", "PLATFORM_ADMIN"].includes(target.role);
      const limit = isAdminRole ? limits.admins : limits.drivers;
      const current = isAdminRole ? adminCount : driverCount;

      if (current >= limit) {
        throw new AppError(409, "Plan limit reached", "PLAN_LIMIT_REACHED", {
          plan,
          role: target.role,
          limit,
          current,
        });
      }
    }
  }

  const user = await userService.updateUserActive({
    companyId: req.companyId,
    userId,
    active: body.data.active,
  });

  res.json({ user });
});

const updatePasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

const updateUserPassword = asyncHandler(async (req, res) => {
  const body = updatePasswordSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(400, "Invalid user id", "VALIDATION_ERROR");
  }

  await enforceAdminUserGuards(req, userId);

  const target = await prisma.user.findFirst({
    where: { id: userId, companyId: req.companyId },
    select: { role: true },
  });

  if (!target) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  const password = body.data.password;
  if (!isPasswordValid(password)) {
    throw new AppError(400, PASSWORD_TOO_SHORT_MESSAGE, "VALIDATION_ERROR");
  }

  const user = await userService.updateUserPassword({
    companyId: req.companyId,
    userId,
    password,
  });

  res.json({ user });
});

const updatePhoneSchema = z.object({
  phone: z.string().trim().min(1),
});

const updateUserPhone = asyncHandler(async (req, res) => {
  const body = updatePhoneSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AppError(400, "Invalid user id", "VALIDATION_ERROR");
  }

  await enforceAdminUserGuards(req, userId);

  const target = await prisma.user.findFirst({
    where: { id: userId, companyId: req.companyId },
    select: { id: true, role: true },
  });

  if (!target) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  if (target.role !== "DRIVER") {
    throw new AppError(400, "Only driver phone can be changed", "ONLY_DRIVER_PHONE_CAN_BE_CHANGED");
  }

  const phone = normalizePhone(body.data.phone);
  if (!phone) {
    throw new AppError(400, "Phone is required", "VALIDATION_ERROR");
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      companyId: req.companyId,
      phone,
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new AppError(409, "Phone already registered", "AUTH_PHONE_TAKEN");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      role: true,
      companyId: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  res.json({ user });
});

module.exports = { createUser, listUsers, updateUserActive, updateUserPassword, updateUserPhone };
