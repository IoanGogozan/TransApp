const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const userService = require("../services/userService");
const { ActivityType } = require("@prisma/client");

const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: req.companyId },
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      company: {
        select: { id: true, name: true, slug: true },
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
      phone: user.phone,
      username: user.username,
      role: user.role,
      active: user.isActive,
      mustChangePassword: user.mustChangePassword,
    },
    company: {
      id: user.company.id,
      name: user.company.name,
      slug: user.company.slug,
    },
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

const listMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    where: { companyId: req.companyId, active: true },
    select: { id: true, regNumber: true, name: true },
    orderBy: [{ regNumber: "asc" }],
  });
  res.json({ vehicles });
});

const dateParamSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const timesheetEntrySchema = z.object({
  activityType: z.enum(["DRIVING", "OTHER_WORK", "BREAK", "AVAILABILITY"]),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const timesheetSchema = z.object({
  routeOptionId: z.string().cuid().optional().nullable(),
  vehicleId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
  overtimeType: z.enum(["OT_50", "OT_100"]).optional().nullable(),
  overtimeReason: z.string().optional().nullable(),
  entries: z.array(timesheetEntrySchema),
});

const toDateAtMidnight = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

const parseTimeToMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours === 24 && minutes === 0) return 1440;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const formatMinutes = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const formatDateLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const validateEntries = (entries) => {
  const converted = entries.map((entry, index) => {
    const startMin = parseTimeToMinutes(entry.start);
    const endMin = parseTimeToMinutes(entry.end);
    if (startMin === null || endMin === null) {
      throw new AppError(
        400,
        "Validation failed",
        "VALIDATION_ERROR",
        { entries: { _errors: [`Invalid time format at entry ${index + 1}`] } },
      );
    }
    if (startMin < 0 || endMin > 1440 || startMin >= endMin) {
      throw new AppError(
        400,
        "Validation failed",
        "VALIDATION_ERROR",
        { entries: { _errors: [`Invalid time range at entry ${index + 1}`] } },
      );
    }
    return {
      activityType: entry.activityType,
      startMin,
      endMin,
    };
  });

  const sorted = [...converted].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].startMin < sorted[i - 1].endMin) {
      throw new AppError(
        400,
        "Validation failed",
        "VALIDATION_ERROR",
        { entries: { _errors: ["Entries must not overlap"] } },
      );
    }
  }

  return sorted;
};

const mapTimesheetResponse = (dateStr, day) => ({
  date: dateStr,
  routeOptionId: day?.routeOptionId ?? null,
  vehicleId: day?.vehicleId ?? null,
  note: day?.note ?? null,
  overtimeType: day?.overtimeType ?? null,
  overtimeReason: day?.overtimeReason ?? null,
  entries: (day?.entries ?? []).map((entry) => ({
    activityType: entry.activityType,
    start: formatMinutes(entry.startMin),
    end: formatMinutes(entry.endMin),
  })),
});

const getMyTimesheet = asyncHandler(async (req, res) => {
  const parsedDate = dateParamSchema.safeParse(req.params);
  if (!parsedDate.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsedDate.error.format());
  }
  const dateStr = parsedDate.data.date;
  const dateValue = toDateAtMidnight(dateStr);

  const day = await prisma.timesheetDay.findFirst({
    where: { userId: req.user.id, companyId: req.companyId, date: dateValue },
    include: { entries: { orderBy: { startMin: "asc" } } },
  });

  res.json(mapTimesheetResponse(dateStr, day));
});

const upsertMyTimesheet = asyncHandler(async (req, res) => {
  const parsedDate = dateParamSchema.safeParse(req.params);
  if (!parsedDate.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsedDate.error.format());
  }
  const parsedBody = timesheetSchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsedBody.error.format());
  }

  const dateStr = parsedDate.data.date;
  const dateValue = toDateAtMidnight(dateStr);
  const entries = validateEntries(parsedBody.data.entries);

  const routeOptionId = parsedBody.data.routeOptionId ?? null;
  const note = parsedBody.data.note ?? null;
  const overtimeType = parsedBody.data.overtimeType ?? null;
  const overtimeReasonRaw = parsedBody.data.overtimeReason ?? null;
  const overtimeReason = overtimeReasonRaw === null ? null : overtimeReasonRaw.trim();
  const vehicleId = parsedBody.data.vehicleId ?? null;

  if (overtimeType && !overtimeReason) {
    throw new AppError(
      400,
      "Validation failed",
      "VALIDATION_ERROR",
      { overtimeReason: { _errors: ["Overtime reason is required when overtime type is set"] } },
    );
  }

  if (routeOptionId) {
    const routeOption = await prisma.routeOption.findFirst({
      where: { id: routeOptionId, companyId: req.companyId },
      select: { id: true },
    });
    if (!routeOption) {
      throw new AppError(400, "Invalid route option", "INVALID_ROUTE_OPTION");
    }
  }

  if (vehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId: req.companyId, active: true },
      select: { id: true },
    });
    if (!vehicle) {
      throw new AppError(400, "Invalid vehicle", "INVALID_VEHICLE");
    }
  }

  const day = await prisma.$transaction(async (tx) => {
    const existing = await tx.timesheetDay.upsert({
      where: { userId_date: { userId: req.user.id, date: dateValue } },
      update: {
        routeOptionId,
        vehicleId,
        note,
        overtimeType,
        overtimeReason,
      },
      create: {
        companyId: req.companyId,
        userId: req.user.id,
        date: dateValue,
        routeOptionId,
        vehicleId,
        note,
        overtimeType,
        overtimeReason,
      },
    });

    await tx.timesheetEntry.deleteMany({ where: { timesheetDayId: existing.id } });
    if (entries.length > 0) {
      await tx.timesheetEntry.createMany({
        data: entries.map((entry) => ({
          timesheetDayId: existing.id,
          activityType: entry.activityType,
          startMin: entry.startMin,
          endMin: entry.endMin,
        })),
      });
    }

    return tx.timesheetDay.findFirst({
      where: { id: existing.id },
      include: { entries: { orderBy: { startMin: "asc" } } },
    });
  });

  res.json(mapTimesheetResponse(dateStr, day));
});

const listMyRoutes = asyncHandler(async (req, res) => {
  const routes = await prisma.routeOption.findMany({
    where: { companyId: req.companyId, active: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  res.json({
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
    })),
  });
});

const listMyCustomers = asyncHandler(async (req, res) => {
  const customers = await prisma.customerOption.findMany({
    where: { companyId: req.companyId, active: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  res.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
    })),
  });
});

const runStartSchema = z.object({
  activityType: z.nativeEnum(ActivityType),
  customerOptionId: z.string().cuid(),
  routeOptionId: z.string(),
  vehicleId: z.number().int().positive().optional().nullable(),
});

const CHECKIN_VALID_HOURS = 24;
const CHECKIN_VALID_MS = CHECKIN_VALID_HOURS * 60 * 60 * 1000;

const ensureDriverActive = (req) => {
  if (req.user.role !== "DRIVER") {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  if (!req.companyId) {
    throw new AppError(400, "Company not found on request", "NO_COMPANY");
  }
  if (req.user.isActive === false) {
    throw new AppError(403, "User inactive", "USER_INACTIVE");
  }
};

const listMyRuns = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const dateStr = req.query.date || formatDateLocal();
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const [activeRun, runs] = await Promise.all([
    prisma.workRun.findFirst({
      where: { companyId: req.companyId, userId: req.user.id, endedAt: null },
      include: {
        customerOption: { select: { id: true, name: true } },
        routeOption: { select: { id: true, name: true } },
        vehicle: { select: { id: true, regNumber: true, name: true } },
      },
    }),
    prisma.workRun.findMany({
      where: {
        companyId: req.companyId,
        userId: req.user.id,
        startedAt: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startedAt: "asc" },
      include: {
        customerOption: { select: { id: true, name: true } },
        routeOption: { select: { id: true, name: true } },
        vehicle: { select: { id: true, regNumber: true, name: true } },
      },
    }),
  ]);

  res.json({
    date: dateStr,
    activeRun,
    runs,
  });
});

const startMyRun = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const parsed = runStartSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }
  const { activityType, customerOptionId, routeOptionId, vehicleId } = parsed.data;

  const existingActive = await prisma.workRun.findFirst({
    where: { companyId: req.companyId, userId: req.user.id, endedAt: null },
  });
  if (existingActive) {
    throw new AppError(409, "Active run already exists", "ACTIVE_RUN_EXISTS");
  }

  const customerOption = await prisma.customerOption.findFirst({
    where: { id: customerOptionId, companyId: req.companyId, active: true },
    select: { id: true, name: true },
  });
  if (!customerOption) {
    throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
  }

  const routeOption = await prisma.routeOption.findFirst({
    where: { id: routeOptionId, companyId: req.companyId, active: true },
    select: { id: true, name: true },
  });
  if (!routeOption) {
    throw new AppError(404, "Route not found", "ROUTE_NOT_FOUND");
  }

  let vehicle = null;
  if (vehicleId != null) {
    vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId: req.companyId, active: true },
      select: { id: true, regNumber: true, name: true },
    });
    if (!vehicle) {
      throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");
    }
  }

  if (vehicleId != null) {
    const latestCheckIn = await prisma.vehicleCheckIn.findFirst({
      where: { companyId: req.companyId, userId: req.user.id, vehicleId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!latestCheckIn || Date.now() - latestCheckIn.createdAt.getTime() > CHECKIN_VALID_MS) {
      throw new AppError(400, "Vehicle check-in required (valid for 24h)", "VEHICLE_CHECKIN_REQUIRED");
    }
  }

  const now = new Date();
  const created = await prisma.workRun.create({
    data: {
      companyId: req.companyId,
      userId: req.user.id,
      activityType,
      customerOptionId,
      routeOptionId,
      vehicleId: vehicleId ?? null,
      startedAt: now,
      endedAt: null,
    },
    include: {
      customerOption: { select: { id: true, name: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
  });

  res.status(201).json(created);
});

const stopMyRun = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const activeRun = await prisma.workRun.findFirst({
    where: { companyId: req.companyId, userId: req.user.id, endedAt: null },
    include: {
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
  });
  if (!activeRun) {
    throw new AppError(409, "No active run", "NO_ACTIVE_RUN");
  }

  const now = new Date();
  const updated = await prisma.workRun.update({
    where: { id: activeRun.id },
    data: { endedAt: now },
    include: {
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
  });

  res.json(updated);
});

const vehicleCheckInSchema = z.object({
  vehicleId: z.number().int().positive(),
  allOk: z.boolean().optional().default(true),
  note: z.string().max(500).optional(),
});

const createVehicleCheckIn = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const parsed = vehicleCheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const { vehicleId, allOk = true, note } = parsed.data;

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, companyId: req.companyId, active: true },
    select: { id: true },
  });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");
  }

  const created = await prisma.vehicleCheckIn.create({
    data: {
      companyId: req.companyId,
      userId: req.user.id,
      vehicleId,
      allOk,
      note: note ?? null,
      checkedAt: new Date(),
    },
    select: {
      id: true,
      vehicleId: true,
      allOk: true,
      note: true,
      checkedAt: true,
    },
  });

  res.status(201).json(created);
});

const listMyRecentVehicleCheckIns = asyncHandler(async (req, res) => {
  const hoursRaw = Number(req.query.hours);
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const checkIns = await prisma.vehicleCheckIn.findMany({
    where: { companyId: req.companyId, userId: req.user.id, createdAt: { gte: since } },
    select: { vehicleId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const seen = new Set();
  const latestByVehicle = [];
  for (const checkIn of checkIns) {
    if (seen.has(checkIn.vehicleId)) continue;
    seen.add(checkIn.vehicleId);
    latestByVehicle.push({
      vehicleId: checkIn.vehicleId,
      checkedInAt: checkIn.createdAt.toISOString(),
    });
  }

  res.json({ checkIns: latestByVehicle });
});

module.exports = {
  getMe,
  updateMyPassword,
  listMyVehicles,
  getMyTimesheet,
  upsertMyTimesheet,
  listMyRoutes,
  listMyCustomers,
  listMyRuns,
  startMyRun,
  stopMyRun,
  createVehicleCheckIn,
  listMyRecentVehicleCheckIns,
};
