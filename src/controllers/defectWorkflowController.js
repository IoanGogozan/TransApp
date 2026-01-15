const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const defectWorkflowService = require("../services/defectWorkflowService");

const idSchema = z.object({
  id: z.string().min(1),
});

const assignSchema = z.object({
  assignedToUserId: z.number().int().positive().nullable(),
});

const commentSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const assign = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }
  const body = assignSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const defect = await defectWorkflowService.assignDefect({
    companyId: req.companyId,
    user: req.user,
    defectId: params.data.id,
    assignedToUserId: body.data.assignedToUserId,
  });

  res.json({ defect });
});

const addComment = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }
  const body = commentSchema.safeParse(req.body);
  if (!body.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", body.error.format());
  }

  const comment = await defectWorkflowService.addComment({
    companyId: req.companyId,
    user: req.user,
    defectId: params.data.id,
    message: body.data.message,
  });

  res.status(201).json({ comment });
});

const listComments = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }
  const query = listSchema.safeParse(req.query);
  if (!query.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", query.error.format());
  }

  const items = await defectWorkflowService.listComments({
    companyId: req.companyId,
    defectId: params.data.id,
    limit: query.data.limit,
    offset: query.data.offset,
    user: req.user,
  });

  res.json({ items, meta: { limit: query.data.limit, offset: query.data.offset } });
});

const listHistory = asyncHandler(async (req, res) => {
  const params = idSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }
  const query = listSchema.safeParse(req.query);
  if (!query.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", query.error.format());
  }

  const items = await defectWorkflowService.listHistory({
    companyId: req.companyId,
    defectId: params.data.id,
    limit: query.data.limit,
    offset: query.data.offset,
    user: req.user,
  });

  res.json({ items, meta: { limit: query.data.limit, offset: query.data.offset } });
});

module.exports = {
  assign,
  addComment,
  listComments,
  listHistory,
};
