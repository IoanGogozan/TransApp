const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const shiftService = require("../services/shiftService");

const startSchema = z.object({
  vehicleId: z.coerce.number().int().positive().optional(),
  startAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const endSchema = z.object({
  endAt: z.string().datetime().optional(),
});

const idSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const listSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  userId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const startShift = asyncHandler(async (req, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const shift = await shiftService.startShift({
    companyId: req.companyId,
    user: req.user,
    vehicleId: parsed.data.vehicleId,
    startAt: parsed.data.startAt,
    notes: parsed.data.notes,
  });

  res.status(201).json({ shift });
});

const endShift = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const parsed = endSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const shift = await shiftService.endShift({
    companyId: req.companyId,
    user: req.user,
    shiftId: params.data.id,
    endAt: parsed.data.endAt,
  });

  res.json({ shift });
});

const listShifts = asyncHandler(async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const items = await shiftService.listShifts({
    companyId: req.companyId,
    user: req.user,
    from: parsed.data.from,
    to: parsed.data.to,
    userId: parsed.data.userId,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  res.json({
    items,
    meta: { limit: parsed.data.limit, offset: parsed.data.offset },
  });
});

const getShift = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const shift = await shiftService.getShiftById({
    companyId: req.companyId,
    user: req.user,
    shiftId: params.data.id,
  });

  res.json({ shift });
});

module.exports = {
  startShift,
  endShift,
  listShifts,
  getShift,
};
