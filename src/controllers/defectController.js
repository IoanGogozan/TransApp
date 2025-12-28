const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const defectService = require("../services/defectService");

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
});

const listSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  reportedByUserId: z.coerce.number().int().positive().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const idSchema = z.object({
  id: z.string().min(1),
});

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

const createDefect = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const defect = await defectService.createManualDefect({
    companyId: req.companyId,
    user: req.user,
    vehicleId: parsed.data.vehicleId,
    title: parsed.data.title,
    description: parsed.data.description,
  });

  res.status(201).json({ defect });
});

const listDefects = asyncHandler(async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const items = await defectService.listDefects({
    companyId: req.companyId,
    user: req.user,
    filters: parsed.data,
  });

  res.json({ items, meta: { limit: parsed.data.limit, offset: parsed.data.offset } });
});

const getDefect = asyncHandler(async (req, res) => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const defect = await defectService.getDefect({
    companyId: req.companyId,
    user: req.user,
    defectId: parsed.data.id,
  });

  res.json({ defect });
});

const updateStatus = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }
  const body = statusSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const defect = await defectService.setStatus({
    companyId: req.companyId,
    user: req.user,
    defectId: params.data.id,
    status: body.data.status,
  });

  res.json({ defect });
});

module.exports = {
  createDefect,
  listDefects,
  getDefect,
  updateStatus,
};
