const AppError = require("./AppError");

const parseDateQueryParam = (value, fieldName = "date") => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(
      400,
      "Invalid date format (expected YYYY-MM-DD)",
      "VALIDATION_ERROR",
      { [fieldName]: { _errors: ["Date must be in YYYY-MM-DD format"] } },
    );
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      400,
      "Invalid date value",
      "VALIDATION_ERROR",
      { [fieldName]: { _errors: ["Date must be a valid calendar date"] } },
    );
  }

  return parsed;
};

const getTodayYYYYMMDDInOslo = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
};

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const values = parts.reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
};

const getOsloDayRangeForDate = (dateStr) => {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    throw new AppError(400, "Invalid date value", "VALIDATION_ERROR");
  }

  const startLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  const startOffset = getTimeZoneOffsetMs(startLocal, "Europe/Oslo");
  const endOffset = getTimeZoneOffsetMs(endLocal, "Europe/Oslo");
  const start = new Date(startLocal.getTime() - startOffset);
  const end = new Date(endLocal.getTime() - endOffset);
  return { start, end };
};

module.exports = { parseDateQueryParam, getTodayYYYYMMDDInOslo, getOsloDayRangeForDate };
