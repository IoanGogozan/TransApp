const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driverId: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val))
    .optional(),
  routeId: z.string().cuid().optional(),
});

const workRunDetailsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  driverId: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number(val)),
});

const dateAtMidnight = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

const toDateString = (date) => date.toISOString().slice(0, 10);

const addUtcDays = (date, days) => {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
};

const listTimesheets = asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const { from, to, driverId, routeId } = parsed.data;
  const where = {
    companyId: req.companyId,
    date: {
      gte: dateAtMidnight(from),
      lte: dateAtMidnight(to),
    },
  };
  if (driverId !== undefined) {
    where.userId = driverId;
  }
  if (routeId !== undefined) {
    where.routeOptionId = routeId;
  }

  const days = await prisma.timesheetDay.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, phone: true, username: true } },
      routeOption: { select: { id: true, name: true } },
      entries: true,
    },
    orderBy: [{ date: "asc" }, { userId: "asc" }],
  });

  const rows = days.map((day) => {
    const totals = {
      DRIVING: 0,
      OTHER_WORK: 0,
      BREAK: 0,
      AVAILABILITY: 0,
    };
    day.entries.forEach((entry) => {
      const duration = entry.endMin - entry.startMin;
      totals[entry.activityType] = (totals[entry.activityType] || 0) + duration;
    });
    return {
      date: toDateString(day.date),
      driver: {
        id: day.user.id,
        email: day.user.email,
        phone: day.user.phone,
        username: day.user.username,
      },
      route: day.routeOption ? { id: day.routeOption.id, name: day.routeOption.name } : null,
      totalsMinutes: totals,
      overtimeType: day.overtimeType,
      overtimeReason: day.overtimeReason,
    };
  });

  res.json({ timesheets: rows });
});

const listWorkRunTimesheets = asyncHandler(async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const { from, to, driverId, routeId } = parsed.data;
  const fromStart = dateAtMidnight(from);
  const toEndExclusive = addUtcDays(dateAtMidnight(to), 1);

  const where = {
    companyId: req.companyId,
    startedAt: {
      gte: fromStart,
      lt: toEndExclusive,
    },
  };
  if (driverId !== undefined) {
    where.userId = driverId;
  }
  if (routeId !== undefined) {
    where.routeOptionId = routeId;
  }

  const runs = await prisma.workRun.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, phone: true, username: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
      customerOption: { select: { id: true, name: true } },
    },
    orderBy: [{ startedAt: "asc" }, { userId: "asc" }],
  });

  const rowsByKey = new Map();
  for (const run of runs) {
    const date = toDateString(run.startedAt);
    const key = `${date}|${run.userId}`;
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        date,
        driver: {
          id: run.user.id,
          email: run.user.email,
          phone: run.user.phone,
          username: run.user.username,
        },
        totalsMinutes: {
          DRIVING: 0,
          OTHER_WORK: 0,
          BREAK: 0,
          AVAILABILITY: 0,
        },
        routes: [],
        vehicles: [],
        customers: [],
        runsCount: 0,
        routeIds: new Set(),
        vehicleIds: new Set(),
        customerIds: new Set(),
      });
    }

    const row = rowsByKey.get(key);
    row.runsCount += 1;
    if (run.routeOption && !row.routeIds.has(run.routeOption.id)) {
      row.routeIds.add(run.routeOption.id);
      row.routes.push({ id: run.routeOption.id, name: run.routeOption.name });
    }
    if (run.vehicle && !row.vehicleIds.has(run.vehicle.id)) {
      row.vehicleIds.add(run.vehicle.id);
      row.vehicles.push({ id: run.vehicle.id, regNumber: run.vehicle.regNumber, name: run.vehicle.name });
    }
    if (run.customerOption && !row.customerIds.has(run.customerOption.id)) {
      row.customerIds.add(run.customerOption.id);
      row.customers.push({ id: run.customerOption.id, name: run.customerOption.name });
    }
    const startMs = run.startedAt?.getTime();
    const endMs = (run.endedAt ? run.endedAt : new Date()).getTime();
    const duration = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.floor((endMs - startMs) / 60000) : 0;
    const safeDuration = duration > 0 ? duration : 0;
    row.totalsMinutes[run.activityType] = (row.totalsMinutes[run.activityType] || 0) + safeDuration;
  }

  const rows = Array.from(rowsByKey.values())
    .map(({ routeIds, vehicleIds, customerIds, ...row }) => row)
    .sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.driver.id !== b.driver.id) return a.driver.id - b.driver.id;
    return 0;
  });

  res.json({ timesheets: rows });
});

const listWorkRunDetails = asyncHandler(async (req, res) => {
  const parsed = workRunDetailsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const { date, driverId } = parsed.data;
  const fromStart = dateAtMidnight(date);
  const toEndExclusive = addUtcDays(fromStart, 1);

  const runs = await prisma.workRun.findMany({
    where: {
      companyId: req.companyId,
      userId: driverId,
      startedAt: {
        gte: fromStart,
        lt: toEndExclusive,
      },
    },
    include: {
      customerOption: { select: { id: true, name: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
    },
    orderBy: { startedAt: "asc" },
  });

  res.json({ date, driverId, runs });
});

module.exports = { listTimesheets, listWorkRunTimesheets, listWorkRunDetails };
