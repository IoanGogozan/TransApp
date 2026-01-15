const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { osloDateOnly } = require("../utils/time");

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

const updateWorkEntryAdminParamsSchema = z.object({
  id: z.string().cuid(),
});

const updateWorkEntryAdminBodySchema = z
  .object({
    activityType: z.enum(["DRIVING", "OTHER_WORK", "BREAK", "AVAILABILITY"]).optional(),
    durationMin: z.number().int().positive().optional(),
    note: z.string().optional().nullable(),
  })
  .refine(
    (data) => data.activityType !== undefined || data.durationMin !== undefined || data.note !== undefined,
    { message: "At least one field is required" },
  );

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
        customerBreakdownMap: new Map(),
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

    const customerKey = entry.customerOptionId ?? "__INTERNAL__";
    const customerName = entry.customerOption?.name || "Internal";
    if (!row.customerBreakdownMap.has(customerKey)) {
      row.customerBreakdownMap.set(customerKey, {
        customerId: entry.customerOptionId ?? null,
        customerName,
        routes: new Set(),
        vehicles: new Map(),
        minutes: {
          DRIVING: 0,
          OTHER_WORK: 0,
          BREAK: 0,
          AVAILABILITY: 0,
        },
        totalMin: 0,
        entryCount: 0,
      });
    }
    const customerBucket = row.customerBreakdownMap.get(customerKey);
    const safeMinutes = Math.max(0, entry.durationMin || 0);
    customerBucket.minutes[entry.activityType] =
      (customerBucket.minutes[entry.activityType] || 0) + safeMinutes;
    customerBucket.totalMin += safeMinutes;
    customerBucket.entryCount += 1;
    if (entry.routeOption?.name) {
      customerBucket.routes.add(entry.routeOption.name);
    }
    if (entry.vehicle) {
      customerBucket.vehicles.set(entry.vehicle.id, {
        vehicleId: entry.vehicle.id,
        regNumber: entry.vehicle.regNumber,
      });
    }
  }

  const rows = Array.from(rowsByKey.values())
    .map(({ routeIds, vehicleIds, customerIds, customerBreakdownMap, ...row }) => ({
      ...row,
      customerBreakdown: Array.from(customerBreakdownMap.values()).map((item) => ({
        customerId: item.customerId,
        customerName: item.customerName,
        routes: Array.from(item.routes),
        vehicles: Array.from(item.vehicles.values()),
        minutes: {
          DRIVING: item.minutes.DRIVING || 0,
          OTHER_WORK: item.minutes.OTHER_WORK || 0,
          BREAK: item.minutes.BREAK || 0,
          AVAILABILITY: item.minutes.AVAILABILITY || 0,
        },
        totalMin: item.totalMin,
        entryCount: item.entryCount,
      })),
    }))
    .sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.driver.id !== b.driver.id) return a.driver.id - b.driver.id;
    return 0;
  });

  const userIds = Array.from(new Set(rows.map((row) => row.driver.id)));
  const rowKeys = new Set(rows.map((row) => `${row.date}|${row.driver.id}`));
  const checkInFrom = addUtcDays(fromStart, -1);
  const checkInTo = addUtcDays(toEndExclusive, 1);
  let checkInsByRowKey = new Map();
  if (userIds.length > 0) {
    const checkIns = await prisma.vehicleCheckIn.findMany({
      where: {
        companyId: req.companyId,
        userId: { in: userIds },
        checkedAt: { gte: checkInFrom, lt: checkInTo },
      },
      select: {
        userId: true,
        vehicleId: true,
        checkedAt: true,
        allOk: true,
        vehicle: { select: { regNumber: true } },
      },
      orderBy: { checkedAt: "asc" },
    });

    checkInsByRowKey = checkIns.reduce((map, ci) => {
      const dateOslo = osloDateOnly(ci.checkedAt);
      if (dateOslo < from || dateOslo > to) return map;
      const key = `${dateOslo}|${ci.userId}`;
      if (!rowKeys.has(key)) return map;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        vehicleId: ci.vehicleId,
        regNumber: ci.vehicle?.regNumber ?? "",
        checkedAt: ci.checkedAt.toISOString(),
        allOk: ci.allOk,
      });
      return map;
    }, new Map());
  }

  const rowsWithCheckIns = rows.map((row) => ({
    ...row,
    checkIns: checkInsByRowKey.get(`${row.date}|${row.driver.id}`) ?? [],
  }));

  res.json({ timesheets: rowsWithCheckIns });
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

  const vehicleIds = [...new Set(entries.map((entry) => entry.vehicleId).filter(Boolean))];
  let checkIns = [];
  if (vehicleIds.length > 0) {
    const rangeStart = addUtcDays(fromStart, -1);
    const rangeEnd = addUtcDays(toEndExclusive, 1);
    const checkInsResults = await prisma.vehicleCheckIn.findMany({
      where: {
        companyId: req.companyId,
        userId: driverId,
        vehicleId: { in: vehicleIds },
        checkedAt: { gte: rangeStart, lt: rangeEnd },
      },
      select: {
        vehicleId: true,
        checkedAt: true,
        allOk: true,
        note: true,
        vehicle: { select: { regNumber: true, name: true } },
      },
      orderBy: { checkedAt: "asc" },
    });
    const checkInsForDate = checkInsResults.filter((ci) => osloDateOnly(ci.checkedAt) === date);
    checkIns = checkInsForDate.map((ci) => ({
      vehicleId: ci.vehicleId,
      vehicle: ci.vehicle ? { regNumber: ci.vehicle.regNumber, name: ci.vehicle.name ?? null } : null,
      checkedAt: ci.checkedAt.toISOString(),
      allOk: ci.allOk,
      note: ci.note ?? null,
    }));
  }

  res.json({
    date,
    driverId,
    entries: entries.map((entry) => ({
      id: entry.id,
      activityType: entry.activityType,
      durationMin: entry.durationMin,
      customer: entry.customerOption ? { name: entry.customerOption.name } : null,
      route: entry.routeOption ? { name: entry.routeOption.name } : null,
      vehicle: entry.vehicle ? { regNumber: entry.vehicle.regNumber, name: entry.vehicle.name } : null,
      note: entry.note ?? null,
    })),
    checkIns,
  });
});

const updateWorkEntryAdmin = asyncHandler(async (req, res) => {
  const parsedParams = updateWorkEntryAdminParamsSchema.safeParse({ id: req.params.id });
  if (!parsedParams.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsedParams.error.format());
  }

  const parsedBody = updateWorkEntryAdminBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsedBody.error.format());
  }

  const { id } = parsedParams.data;
  const existing = await prisma.workEntry.findFirst({
    where: { id, companyId: req.companyId },
  });

  if (!existing) {
    throw new AppError(404, "Entry not found", "ENTRY_NOT_FOUND");
  }

  const updateData = {};
  if (parsedBody.data.activityType !== undefined) {
    updateData.activityType = parsedBody.data.activityType;
  }
  if (parsedBody.data.durationMin !== undefined) {
    updateData.durationMin = parsedBody.data.durationMin;
  }
  if (parsedBody.data.note !== undefined) {
    updateData.note = parsedBody.data.note ?? null;
  }

  const updatedEntry = await prisma.workEntry.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      activityType: true,
      durationMin: true,
      note: true,
      updatedAt: true,
    },
  });

  res.json({ entry: updatedEntry });
});

module.exports = { listWorkRunTimesheets, listWorkRunDetails, updateWorkEntryAdmin };
