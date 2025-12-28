const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const reportService = require("../services/reportService");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateString = z.string().regex(dateRegex, "Date must be YYYY-MM-DD");

const timesheetSchema = z.object({
  from: dateString,
  to: dateString,
  userId: z.coerce.number().int().positive().optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  groupBy: z.enum(["day", "day_user"]).optional().default("day"),
});

const validateRange = (from, to) => {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (fromDate > toDate) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", { field: "from", message: "from must be <= to" });
  }
  const diffDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 62) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", { field: "range", message: "Range too large" });
  }
};

const timesheet = asyncHandler(async (req, res) => {
  const parsed = timesheetSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }
  validateRange(parsed.data.from, parsed.data.to);

  const result = await reportService.timesheet({
    companyId: req.companyId,
    user: req.user,
    filters: parsed.data,
  });

  res.json(result);
});

const timesheetCsv = asyncHandler(async (req, res) => {
  const parsed = timesheetSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }
  validateRange(parsed.data.from, parsed.data.to);

  const csv = await reportService.timesheetCsv({
    companyId: req.companyId,
    user: req.user,
    filters: parsed.data,
  });

  res.setHeader("Content-Type", "text/csv");
  res.send(csv);
});

module.exports = {
  timesheet,
  timesheetCsv,
};
