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
    date: {
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

  const entries = await prisma.workEntry.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, phone: true, username: true } },
      routeOption: { select: { id: true, name: true } },
      vehicle: { select: { id: true, regNumber: true, name: true } },
      customerOption: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { userId: "asc" }, { createdAt: "asc" }],
  });

  const rowsByKey = new Map();
  for (const entry of entries) {
    const date = toDateString(entry.date);
    const key = `${date}|${entry.userId}`;
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, {
        date,
        driver: {
          id: entry.user.id,
          email: entry.user.email,
          phone: entry.user.phone,
          username: entry.user.username,
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
        entriesCount: 0,
        routeIds: new Set(),
        vehicleIds: new Set(),
        customerIds: new Set(),
      });
    }

    const row = rowsByKey.get(key);
    row.entriesCount += 1;
    if (entry.routeOption && !row.routeIds.has(entry.routeOption.id)) {
      row.routeIds.add(entry.routeOption.id);
      row.routes.push({ id: entry.routeOption.id, name: entry.routeOption.name });
    }
    if (entry.vehicle && !row.vehicleIds.has(entry.vehicle.id)) {
      row.vehicleIds.add(entry.vehicle.id);
      row.vehicles.push({ id: entry.vehicle.id, regNumber: entry.vehicle.regNumber, name: entry.vehicle.name });
    }
    if (entry.customerOption && !row.customerIds.has(entry.customerOption.id)) {
      row.customerIds.add(entry.customerOption.id);
      row.customers.push({ id: entry.customerOption.id, name: entry.customerOption.name });
    }
    row.totalsMinutes[entry.activityType] =
      (row.totalsMinutes[entry.activityType] || 0) + Math.max(0, entry.durationMin || 0);
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

  const entries = await prisma.workEntry.findMany({
    where: {
      companyId: req.companyId,
      userId: driverId,
      date: {
        gte: fromStart,
        lt: toEndExclusive,
      },
    },
    include: {
      customerOption: { select: { name: true } },
      routeOption: { select: { name: true } },
      vehicle: { select: { regNumber: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    date,
    driverId,
    entries: entries.map((entry) => ({
      activityType: entry.activityType,
      durationMin: entry.durationMin,
      customer: entry.customerOption ? { name: entry.customerOption.name } : null,
      route: entry.routeOption ? { name: entry.routeOption.name } : null,
      vehicle: entry.vehicle ? { regNumber: entry.vehicle.regNumber, name: entry.vehicle.name } : null,
      note: entry.note ?? null,
    })),
  });
});

module.exports = { listWorkRunTimesheets, listWorkRunDetails };
