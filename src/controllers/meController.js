const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { parseDateQueryParam, getTodayYYYYMMDDInOslo, getOsloDayRangeForDate } = require("../utils/dateUtils");
const userService = require("../services/userService");

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
    orderBy: [{ name: "asc" }],
  });

  res.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
    })),
  });
});

const entryCreateSchema = z.object({
  date: z.string(),
  activityType: z.enum(["DRIVING", "OTHER_WORK", "BREAK", "AVAILABILITY"]),
  durationMin: z.number().int().positive(),
  customerOptionId: z.string().cuid().optional().nullable(),
  routeOptionId: z.string().cuid().optional().nullable(),
  vehicleId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});

const entryUpdateSchema = z.object({
  date: z.string().optional(),
  activityType: z.enum(["DRIVING", "OTHER_WORK", "BREAK", "AVAILABILITY"]).optional(),
  durationMin: z.number().int().positive().optional(),
  customerOptionId: z.string().cuid().optional().nullable(),
  routeOptionId: z.string().cuid().optional().nullable(),
  vehicleId: z.number().int().positive().optional().nullable(),
  note: z.string().optional().nullable(),
});
const ensureDriverActive = (req) => {
  const allowedRoles = new Set(["DRIVER", "ADMIN", "PLATFORM_ADMIN"]);
  if (!allowedRoles.has(req.user.role)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  if (!req.companyId) {
    throw new AppError(400, "Company not found on request", "NO_COMPANY");
  }
  if (req.user.isActive === false) {
    throw new AppError(403, "User inactive", "USER_INACTIVE");
  }
};

const listMyEntries = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const dateValue = parseDateQueryParam(req.query.date, "date");

  const items = await prisma.workEntry.findMany({
    where: {
      companyId: req.companyId,
      userId: req.user.id,
      date: dateValue,
    },
    include: {
      customerOption: { select: { id: true, name: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({ items });
});

const createMyEntry = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const parsed = entryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const dateValue = parseDateQueryParam(parsed.data.date, "date");
  const {
    activityType,
    durationMin,
    customerOptionId,
    routeOptionId,
    vehicleId,
    note,
  } = parsed.data;

  if ((activityType === "DRIVING" || activityType === "OTHER_WORK") && !customerOptionId) {
    throw new AppError(
      400,
      "Customer is required for selected activity type",
      "VALIDATION_ERROR",
      { customerOptionId: { _errors: ["Customer is required for driving/other work"] } },
    );
  }

  if (customerOptionId) {
    const customer = await prisma.customerOption.findFirst({
      where: { id: customerOptionId, companyId: req.companyId, active: true },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(400, "Invalid customer", "INVALID_CUSTOMER_OPTION");
    }
  }

  if (routeOptionId) {
    const routeOption = await prisma.routeOption.findFirst({
      where: { id: routeOptionId, companyId: req.companyId, active: true },
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

  if (activityType === "DRIVING" && vehicleId) {
      const todayDateStr = getTodayYYYYMMDDInOslo();
      const entryDateStr = parsed.data.date;
      if (entryDateStr === todayDateStr) {
        const { start, end } = getOsloDayRangeForDate(todayDateStr);
        const checkIn = await prisma.vehicleCheckIn.findFirst({
          where: {
            companyId: req.companyId,
            userId: req.user.id,
            vehicleId,
            checkedAt: { gte: start, lte: end },
          },
          select: { id: true },
        });
      if (!checkIn) {
        return res.status(409).json({
          code: "VEHICLE_CHECKIN_REQUIRED",
          message: "Vehicle check-in required (valid for 24h) before driving today.",
        });
      }
    }
  }

  const created = await prisma.workEntry.create({
    data: {
      companyId: req.companyId,
      userId: req.user.id,
      date: dateValue,
      activityType,
      durationMin,
      customerOptionId: customerOptionId ?? null,
      routeOptionId: routeOptionId ?? null,
      vehicleId: vehicleId ?? null,
      note: note ?? null,
      source: "MANUAL",
    },
    include: {
      customerOption: { select: { id: true, name: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
  });

  res.status(201).json(created);
});

const updateMyEntry = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const parsed = entryUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const id = String(req.params.id || "");
  if (!id) {
    throw new AppError(400, "Invalid entry id", "VALIDATION_ERROR");
  }

  const existing = await prisma.workEntry.findFirst({
    where: { id, companyId: req.companyId, userId: req.user.id },
  });
  if (!existing) {
    throw new AppError(404, "Entry not found", "ENTRY_NOT_FOUND");
  }

  const nextDate = parsed.data.date !== undefined ? parseDateQueryParam(parsed.data.date, "date") : existing.date;
  const nextActivityType = parsed.data.activityType ?? existing.activityType;
  const nextDurationMin = parsed.data.durationMin ?? existing.durationMin;
  const nextCustomerOptionId =
    parsed.data.customerOptionId !== undefined ? parsed.data.customerOptionId : existing.customerOptionId;
  const nextRouteOptionId =
    parsed.data.routeOptionId !== undefined ? parsed.data.routeOptionId : existing.routeOptionId;
  const nextVehicleId =
    parsed.data.vehicleId !== undefined ? parsed.data.vehicleId : existing.vehicleId;
  const nextNote = parsed.data.note !== undefined ? parsed.data.note ?? null : existing.note;

  if ((nextActivityType === "DRIVING" || nextActivityType === "OTHER_WORK") && !nextCustomerOptionId) {
    throw new AppError(
      400,
      "Customer is required for selected activity type",
      "VALIDATION_ERROR",
      { customerOptionId: { _errors: ["Customer is required for driving/other work"] } },
    );
  }

  if (nextCustomerOptionId) {
    const customer = await prisma.customerOption.findFirst({
      where: { id: nextCustomerOptionId, companyId: req.companyId, active: true },
      select: { id: true },
    });
    if (!customer) {
      throw new AppError(400, "Invalid customer", "INVALID_CUSTOMER_OPTION");
    }
  }

  if (nextRouteOptionId) {
    const routeOption = await prisma.routeOption.findFirst({
      where: { id: nextRouteOptionId, companyId: req.companyId, active: true },
      select: { id: true },
    });
    if (!routeOption) {
      throw new AppError(400, "Invalid route option", "INVALID_ROUTE_OPTION");
    }
  }

  if (nextVehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: nextVehicleId, companyId: req.companyId, active: true },
      select: { id: true },
    });
    if (!vehicle) {
      throw new AppError(400, "Invalid vehicle", "INVALID_VEHICLE");
    }
  }

  if (nextActivityType === "DRIVING" && nextVehicleId) {
      const todayDateStr = getTodayYYYYMMDDInOslo();
      const entryDateStr = nextDate.toISOString().slice(0, 10);
      if (entryDateStr === todayDateStr) {
        const { start, end } = getOsloDayRangeForDate(todayDateStr);
        const checkIn = await prisma.vehicleCheckIn.findFirst({
          where: {
            companyId: req.companyId,
            userId: req.user.id,
            vehicleId: nextVehicleId,
            checkedAt: { gte: start, lte: end },
          },
          select: { id: true },
        });
      if (!checkIn) {
        return res.status(409).json({
          code: "VEHICLE_CHECKIN_REQUIRED",
          message: "Vehicle check-in required (valid for 24h) before driving today.",
        });
      }
    }
  }

  const updated = await prisma.workEntry.update({
    where: { id: existing.id },
    data: {
      date: nextDate,
      activityType: nextActivityType,
      durationMin: nextDurationMin,
      customerOptionId: nextCustomerOptionId ?? null,
      routeOptionId: nextRouteOptionId ?? null,
      vehicleId: nextVehicleId ?? null,
      note: nextNote,
    },
    include: {
      customerOption: { select: { id: true, name: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
  });

  res.json(updated);
});

const deleteMyEntry = asyncHandler(async (req, res) => {
  ensureDriverActive(req);
  const id = String(req.params.id || "");
  if (!id) {
    throw new AppError(400, "Invalid entry id", "VALIDATION_ERROR");
  }

  const existing = await prisma.workEntry.findFirst({
    where: { id, companyId: req.companyId, userId: req.user.id },
    select: { id: true },
  });
  if (!existing) {
    throw new AppError(404, "Entry not found", "ENTRY_NOT_FOUND");
  }

  await prisma.workEntry.delete({ where: { id: existing.id } });
  res.status(204).send();
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

const vehicleCheckInStatusSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" }),
});

const getMyVehicleCheckInStatus = asyncHandler(async (req, res) => {
  const parsed = vehicleCheckInStatusSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const dateStr = parsed.data.date;
  parseDateQueryParam(dateStr, "date");

  const todayOslo = getTodayYYYYMMDDInOslo();
  const required = dateStr === todayOslo;
  const { start, end } = getOsloDayRangeForDate(dateStr);
  const hoursValid = Math.round((end.getTime() - start.getTime() + 1) / (60 * 60 * 1000));

  if (!required) {
    res.json({
      vehicleId: parsed.data.vehicleId,
      required: false,
      isValid: true,
      hoursValid,
      checkedInAt: null,
      validUntil: null,
    });
    return;
  }

  const checkIn = await prisma.vehicleCheckIn.findFirst({
    where: {
      companyId: req.companyId,
      userId: req.user.id,
      vehicleId: parsed.data.vehicleId,
      checkedAt: { gte: start, lte: end },
    },
    orderBy: { checkedAt: "desc" },
    select: { checkedAt: true },
  });

  if (!checkIn) {
    res.json({
      vehicleId: parsed.data.vehicleId,
      required: true,
      isValid: false,
      hoursValid,
      checkedInAt: null,
      validUntil: null,
    });
    return;
  }

  const checkedInAt = checkIn.checkedAt.toISOString();
  const validUntil = end.toISOString();

  res.json({
    vehicleId: parsed.data.vehicleId,
    required: true,
    isValid: true,
    hoursValid,
    checkedInAt,
    validUntil,
  });
});

module.exports = {
  getMe,
  updateMyPassword,
  listMyVehicles,
  listMyRoutes,
  listMyCustomers,
  listMyEntries,
  createMyEntry,
  updateMyEntry,
  deleteMyEntry,
  createVehicleCheckIn,
  listMyRecentVehicleCheckIns,
  getMyVehicleCheckInStatus,
};
