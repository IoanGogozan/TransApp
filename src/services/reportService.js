const AppError = require("../utils/AppError");
const { osloDateOnly } = require("../utils/time");
const reportRepository = require("../repositories/reportRepository");
const prisma = require("../config/prismaClient");

const parseDate = (value) => {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", { field: "date", value });
  }
  return d;
};

const toUtcRange = (from, to) => {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  const toExclusive = new Date(toDate);
  toExclusive.setDate(toExclusive.getDate() + 1);
  return { fromUtc: fromDate, toUtc: toExclusive };
};

const durationMinutes = (start, end) => Math.max(0, Math.floor((end - start) / 60000));

const buildTotals = (items) => {
  const minutes = items.reduce((sum, item) => sum + item.minutes, 0);
  return { minutes, hours: minutes / 60 };
};

const escapeCsv = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
};

const sortItems = (items, groupBy) =>
  [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (groupBy === "day_user") {
      return (a.userId || 0) - (b.userId || 0);
    }
    return 0;
  });

const timesheet = async ({ companyId, user, filters }) => {
  const { fromUtc, toUtc } = toUtcRange(filters.from, filters.to);
  const userId = user.role === "DRIVER" ? Number(user.id) : filters.userId ? Number(filters.userId) : undefined;
  const vehicleId = filters.vehicleId ? Number(filters.vehicleId) : undefined;

  const shifts = await reportRepository.listClosedShiftsForReport({
    companyId: Number(companyId),
    fromUtc,
    toUtc,
    userId,
    vehicleId,
  });

  const groupBy = filters.groupBy || "day";
  const bucket = {};

  shifts.forEach((shift) => {
    const minutes = durationMinutes(new Date(shift.startAt), new Date(shift.endAt));
    const dateKey = osloDateOnly(shift.startAt);
    if (groupBy === "day_user") {
      const key = `${dateKey}:${shift.userId}`;
      if (!bucket[key]) bucket[key] = { date: dateKey, userId: shift.userId, minutes: 0 };
      bucket[key].minutes += minutes;
    } else {
      if (!bucket[dateKey]) bucket[dateKey] = { date: dateKey, minutes: 0 };
      bucket[dateKey].minutes += minutes;
    }
  });

  const items = Object.values(bucket).map((item) => ({
    ...item,
    hours: item.minutes / 60,
  }));

  const sortedItems = sortItems(items, groupBy);

  return {
    from: filters.from,
    to: filters.to,
    totals: buildTotals(sortedItems),
    items: sortedItems,
  };
};

const timesheetCsv = async (args) => {
  const result = await timesheet(args);
  const hasUser = (result.items[0] && result.items[0].userId !== undefined) || args.filters.groupBy === "day_user";
  const header = hasUser ? "date,userId,minutes,hours" : "date,minutes,hours";
  const lines = result.items.map((item) =>
    hasUser ? `${item.date},${item.userId},${item.minutes},${item.hours}` : `${item.date},${item.minutes},${item.hours}`
  );
  return [header, ...lines].join("\n");
};

module.exports = {
  timesheet,
  timesheetCsv,
  workEntries: async ({ companyId, user, filters }) => {
    const { fromUtc, toUtc } = toUtcRange(filters.from, filters.to);
    const driverId =
      user.role === "DRIVER"
        ? Number(user.id)
        : filters.driverId
          ? Number(filters.driverId)
          : undefined;

    const entries = await prisma.workEntry.findMany({
      where: {
        companyId: Number(companyId),
        date: { gte: fromUtc, lt: toUtc },
        ...(driverId ? { userId: driverId } : {}),
      },
      select: {
        date: true,
        userId: true,
        activityType: true,
        durationMin: true,
        note: true,
        source: true,
        externalRef: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { email: true, phone: true, username: true } },
        customerOption: { select: { name: true } },
        routeOption: { select: { name: true } },
        vehicle: { select: { regNumber: true, name: true } },
      },
      orderBy: [
        { date: "asc" },
        { userId: "asc" },
        { createdAt: "asc" },
      ],
    });

    const groupBy = filters.groupBy || "day_driver";
    const totals = {
      minutesTotal: 0,
      minutesByActivity: {
        DRIVING: 0,
        OTHER_WORK: 0,
        BREAK: 0,
        AVAILABILITY: 0,
      },
    };

    let items = [];

    if (groupBy === "entry") {
      items = entries.map((entry) => {
        const minutes = Math.max(0, Number(entry.durationMin) || 0);
        totals.minutesTotal += minutes;
        if (totals.minutesByActivity[entry.activityType] !== undefined) {
          totals.minutesByActivity[entry.activityType] += minutes;
        }

        const driver =
          entry.user?.email ||
          entry.user?.phone ||
          entry.user?.username ||
          String(entry.userId);

        return {
          date: entry.date.toISOString().slice(0, 10),
          driver,
          activityType: entry.activityType,
          minutes,
          customer: entry.customerOption?.name || "NO_CUSTOMER",
          route: entry.routeOption?.name || "NO_ROUTE",
          vehicleReg: entry.vehicle?.regNumber || "",
          vehicleName: entry.vehicle?.name || "",
          note: entry.note || "",
          source: entry.source || "",
          externalRef: entry.externalRef || "",
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      });
    } else if (groupBy === "day_customer_route") {
      const bucket = new Map();
      const driverSets = new Map();
      const vehicleSets = new Map();

      entries.forEach((entry) => {
        const minutes = Math.max(0, Number(entry.durationMin) || 0);
        const dateKey = entry.date.toISOString().slice(0, 10);
        const customer = entry.customerOption?.name || "NO_CUSTOMER";
        const route = entry.routeOption?.name || "NO_ROUTE";
        const key = `${dateKey}|${customer}|${route}`;

        totals.minutesTotal += minutes;
        if (totals.minutesByActivity[entry.activityType] !== undefined) {
          totals.minutesByActivity[entry.activityType] += minutes;
        }

        if (!bucket.has(key)) {
          bucket.set(key, {
            date: dateKey,
            customer,
            route,
            minutesTotal: 0,
            entriesCount: 0,
          });
          driverSets.set(key, new Set());
          vehicleSets.set(key, new Set());
        }

        const row = bucket.get(key);
        row.minutesTotal += minutes;
        row.entriesCount += 1;
        driverSets.get(key).add(entry.userId);
        vehicleSets.get(key).add(entry.vehicle?.regNumber || "");
      });

      items = Array.from(bucket.values()).map((row) => {
        const key = `${row.date}|${row.customer}|${row.route}`;
        const drivers = driverSets.get(key);
        const vehicles = vehicleSets.get(key);
        const driver =
          drivers && drivers.size === 1 ? String(Array.from(drivers)[0]) : "MULTIPLE";
        const vehicleReg =
          vehicles && vehicles.size === 1
            ? String(Array.from(vehicles)[0] || "")
            : "MULTIPLE";
        return {
          ...row,
          driver,
          vehicleReg,
        };
      });

      items.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.customer !== b.customer) return a.customer.localeCompare(b.customer);
        return a.route.localeCompare(b.route);
      });
    } else {
      const bucket = new Map();

      entries.forEach((entry) => {
        const minutes = Math.max(0, Number(entry.durationMin) || 0);
        const dateKey = entry.date.toISOString().slice(0, 10);
        const userId = entry.userId;
        const activityType = entry.activityType;

        totals.minutesTotal += minutes;
        if (totals.minutesByActivity[activityType] !== undefined) {
          totals.minutesByActivity[activityType] += minutes;
        }

        let key = dateKey;
        if (groupBy === "day_driver" || groupBy === "day_driver_activity" || groupBy === "entry") {
          key = `${key}:${userId}`;
        }
        if (groupBy === "day_driver_activity") {
          key = `${key}:${activityType}`;
        }
        if (groupBy === "entry") {
          key = `${key}:${activityType}:${Math.random()}`;
        }

        if (!bucket.has(key)) {
          bucket.set(key, {
            date: dateKey,
            ...(groupBy !== "day" ? { driverId: userId } : {}),
            ...(groupBy === "day_driver_activity" || groupBy === "entry"
              ? { activityType }
              : {}),
            minutesTotal: 0,
            ...(groupBy === "day" || groupBy === "day_driver"
              ? {
                  minutesByActivity: {
                    DRIVING: 0,
                    OTHER_WORK: 0,
                    BREAK: 0,
                    AVAILABILITY: 0,
                  },
                }
              : {}),
          });
        }

        const row = bucket.get(key);
        row.minutesTotal += minutes;
        if (row.minutesByActivity && row.minutesByActivity[activityType] !== undefined) {
          row.minutesByActivity[activityType] += minutes;
        }
      });

      items = Array.from(bucket.values()).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if ((a.driverId || 0) !== (b.driverId || 0)) return (a.driverId || 0) - (b.driverId || 0);
        return (a.activityType || "").localeCompare(b.activityType || "");
      });
    }

    return {
      from: filters.from,
      to: filters.to,
      groupBy,
      totals,
      items,
    };
  },
  workEntriesCsv: async (args) => {
    const result = await module.exports.workEntries(args);
    const groupBy = result.groupBy || "day_driver";

    let header = "date,minutes_total,driving,other_work,break,availability";
    if (groupBy === "day_driver") {
      header = "date,driver_id,minutes_total,driving,other_work,break,availability";
    } else if (groupBy === "day_driver_activity") {
      header = "date,driver_id,activity_type,minutes_total";
    } else if (groupBy === "day_customer_route") {
      header = "date,customer,route,minutes_total,driver,vehicle_reg,entries_count";
    } else if (groupBy === "entry") {
      header =
        "date,driver,activity_type,minutes,customer,route,vehicle_reg,vehicle_name,note,source,external_ref,created_at,updated_at";
    }

    const lines = result.items.map((item) => {
      if (groupBy === "entry") {
        return [
          escapeCsv(item.date),
          escapeCsv(item.driver),
          escapeCsv(item.activityType),
          escapeCsv(item.minutes),
          escapeCsv(item.customer),
          escapeCsv(item.route),
          escapeCsv(item.vehicleReg),
          escapeCsv(item.vehicleName),
          escapeCsv(item.note),
          escapeCsv(item.source),
          escapeCsv(item.externalRef),
          escapeCsv(item.createdAt),
          escapeCsv(item.updatedAt),
        ].join(",");
      }
      if (groupBy === "day_driver_activity") {
        return `${escapeCsv(item.date)},${escapeCsv(item.driverId)},${escapeCsv(
          item.activityType,
        )},${escapeCsv(item.minutesTotal)}`;
      }
      if (groupBy === "day_customer_route") {
        return [
          escapeCsv(item.date),
          escapeCsv(item.customer),
          escapeCsv(item.route),
          escapeCsv(item.minutesTotal),
          escapeCsv(item.driver),
          escapeCsv(item.vehicleReg),
          escapeCsv(item.entriesCount),
        ].join(",");
      }
      const mins = item.minutesByActivity || {
        DRIVING: 0,
        OTHER_WORK: 0,
        BREAK: 0,
        AVAILABILITY: 0,
      };
      if (groupBy === "day_driver") {
        return `${escapeCsv(item.date)},${escapeCsv(item.driverId)},${escapeCsv(
          item.minutesTotal,
        )},${escapeCsv(mins.DRIVING)},${escapeCsv(mins.OTHER_WORK)},${escapeCsv(
          mins.BREAK,
        )},${escapeCsv(mins.AVAILABILITY)}`;
      }
      return `${escapeCsv(item.date)},${escapeCsv(item.minutesTotal)},${escapeCsv(
        mins.DRIVING,
      )},${escapeCsv(mins.OTHER_WORK)},${escapeCsv(mins.BREAK)},${escapeCsv(
        mins.AVAILABILITY,
      )}`;
    });

    return [header, ...lines].join("\n");
  },
};
