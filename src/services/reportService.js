const AppError = require("../utils/AppError");
const { osloDateOnly } = require("../utils/time");
const reportRepository = require("../repositories/reportRepository");

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
};
