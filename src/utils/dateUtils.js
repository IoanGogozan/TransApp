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

module.exports = { parseDateQueryParam, getTodayYYYYMMDDInOslo };
