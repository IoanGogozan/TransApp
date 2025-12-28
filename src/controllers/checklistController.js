const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { questions } = require("../config/checklistQuestions");
const checklistService = require("../services/checklistService");

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be YYYY-MM-DD" });

const statusSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  date: dateString.optional(),
});

const submitSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  date: dateString.optional(),
  answers: z
    .array(
      z.object({
        questionKey: z.string().trim().min(1),
        answer: z.enum(["OK", "DEVIATION", "NOT_APPLICABLE"]),
        comment: z.string().trim().max(500).optional(),
      })
    )
    .min(1, "At least one answer is required"),
});

const listSchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
  vehicleId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const idSchema = z.object({
  id: z.string().min(1),
});

const getQuestions = asyncHandler(async (req, res) => {
  res.json({ questions });
});

const getStatus = asyncHandler(async (req, res) => {
  const parsed = statusSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const status = await checklistService.getStatus({
    companyId: req.companyId,
    vehicleId: parsed.data.vehicleId,
    date: parsed.data.date,
  });

  res.json(status);
});

const submitChecklist = asyncHandler(async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const checklist = await checklistService.submitChecklist({
    companyId: req.companyId,
    user: req.user,
    vehicleId: parsed.data.vehicleId,
    date: parsed.data.date,
    answers: parsed.data.answers,
  });

  res.status(201).json({ checklist });
});

const listChecklists = asyncHandler(async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const items = await checklistService.listChecklists({
    companyId: req.companyId,
    user: req.user,
    from: parsed.data.from,
    to: parsed.data.to,
    vehicleId: parsed.data.vehicleId,
    userId: parsed.data.userId,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  res.json({ items, meta: { limit: parsed.data.limit, offset: parsed.data.offset } });
});

const getChecklist = asyncHandler(async (req, res) => {
  const parsed = idSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const checklist = await checklistService.getChecklist({
    companyId: req.companyId,
    user: req.user,
    checklistId: parsed.data.id,
  });

  res.json({ checklist });
});

module.exports = {
  getQuestions,
  getStatus,
  submitChecklist,
  listChecklists,
  getChecklist,
};
