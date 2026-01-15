const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const defectRepository = require("../repositories/defectRepository");
const defectAttachmentRepository = require("../repositories/defectAttachmentRepository");
const defectEventRepository = require("../repositories/defectEventRepository");
const { ensureDefectAccess } = require("../services/defectWorkflowService");

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const uploadSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

const mimeToExt = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const defectIdSchema = z.object({
  id: z.string().min(1),
});

const attachmentIdSchema = z.object({
  attachmentId: z.string().min(1),
});

const listDefectAttachments = asyncHandler(async (req, res) => {
  const params = defectIdSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const defect = await defectRepository.findDefectById({
    companyId: req.companyId,
    defectId: params.data.id,
  });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  await ensureDefectAccess({ companyId: req.companyId, defectId: defect.id, user: req.user });

  const items = await defectAttachmentRepository.listAttachments({
    companyId: req.companyId,
    defectId: params.data.id,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });

  res.json({ items, meta: { limit: parsed.data.limit, offset: parsed.data.offset } });
});

const downloadDefectAttachment = asyncHandler(async (req, res) => {
  const params = defectIdSchema.merge(attachmentIdSchema).safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const attachment = await defectAttachmentRepository.findAttachmentById({
    companyId: req.companyId,
    attachmentId: params.data.attachmentId,
  });

  if (!attachment) {
    throw new AppError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  if (String(attachment.defectId) !== String(params.data.id)) {
    throw new AppError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  await ensureDefectAccess({ companyId: req.companyId, defectId: attachment.defectId, user: req.user });

  if (attachment.purgedAt || !attachment.storagePath) {
    res.status(410).json({ error: "Attachment has been purged" });
    return;
  }

  const absolutePath = path.join(process.cwd(), attachment.storagePath);
  try {
    await fsp.stat(absolutePath);
  } catch (err) {
    throw new AppError(404, "File not found", "FILE_NOT_FOUND");
  }

  const extension = path.extname(attachment.storagePath);
  const safeTitle = (attachment.title || "attachment").replace(/[\\/:*?"<>|]+/g, "_");
  const filename = `${safeTitle}${extension}`;

  const isInlineImage = attachment.mimeType === "image/jpeg" || attachment.mimeType === "image/png";
  const dispositionType = isInlineImage ? "inline" : "attachment";
  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `${dispositionType}; filename="${filename}"`);
  fs.createReadStream(absolutePath).pipe(res);
});

const uploadDefectAttachment = asyncHandler(async (req, res) => {
  const params = defectIdSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  if (!req.file) {
    throw new AppError(400, "File is required", "VALIDATION_ERROR");
  }

  if (req.file.size > 10 * 1024 * 1024) {
    throw new AppError(400, "File too large", "UPLOAD_FILE_TOO_LARGE");
  }

  const ext = mimeToExt[req.file.mimetype];
  if (!ext) {
    throw new AppError(400, "File type not allowed", "UPLOAD_FILE_TYPE_NOT_ALLOWED");
  }

  const defect = await defectRepository.findDefectById({
    companyId: req.companyId,
    defectId: params.data.id,
  });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  await ensureDefectAccess({ companyId: req.companyId, defectId: defect.id, user: req.user });
  if (defect.status !== "OPEN" && defect.status !== "IN_PROGRESS") {
    res.status(409).json({ error: "Defect is not editable", code: "DEFECT_NOT_EDITABLE" });
    return;
  }

  const attachmentCount = await defectAttachmentRepository.countActiveAttachments({
    companyId: req.companyId,
    defectId: params.data.id,
  });
  if (attachmentCount >= 5) {
    res.status(409).json({
      error: "Attachment limit reached",
      code: "ATTACHMENT_LIMIT_REACHED",
      max: 5,
    });
    return;
  }

  const created = await defectAttachmentRepository.createAttachment({
    companyId: req.companyId,
    defectId: params.data.id,
    uploadedByUserId: req.user.id,
    title: parsed.data.title ?? null,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storagePath: null,
  });

  const relativePath = path.join(
    "uploads",
    String(req.companyId),
    "defects",
    String(params.data.id),
    `${created.id}${ext}`,
  );
  const absolutePath = path.join(process.cwd(), relativePath);

  try {
    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    await fsp.writeFile(absolutePath, req.file.buffer);
    await defectAttachmentRepository.updateAttachmentPath({
      companyId: req.companyId,
      attachmentId: created.id,
      storagePath: relativePath,
    });

    const updated = await defectAttachmentRepository.findAttachmentById({
      companyId: req.companyId,
      attachmentId: created.id,
    });

    await defectEventRepository.createEvent({
      companyId: req.companyId,
      defectId: params.data.id,
      actorUserId: req.user.id,
      type: "ATTACHMENT_ADDED",
      data: { attachmentId: created.id },
    });

    res.status(201).json({ attachment: updated || created });
  } catch (err) {
    await defectAttachmentRepository
      .deleteAttachmentRow({ companyId: req.companyId, attachmentId: created.id })
      .catch(() => null);
    throw err;
  }
});

const deleteDefectAttachment = asyncHandler(async (req, res) => {
  const params = defectIdSchema.merge(attachmentIdSchema).safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", params.error.format());
  }

  const attachment = await defectAttachmentRepository.findAttachmentById({
    companyId: req.companyId,
    attachmentId: params.data.attachmentId,
  });

  if (!attachment) {
    throw new AppError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  if (String(attachment.defectId) !== String(params.data.id)) {
    throw new AppError(404, "Attachment not found", "ATTACHMENT_NOT_FOUND");
  }

  const defect = await ensureDefectAccess({
    companyId: req.companyId,
    defectId: attachment.defectId,
    user: req.user,
  });
  if (defect.status !== "OPEN" && defect.status !== "IN_PROGRESS") {
    res.status(409).json({ error: "Defect is not editable", code: "DEFECT_NOT_EDITABLE" });
    return;
  }

  const role = req.user?.role;
  const isAdmin = role === "ADMIN" || role === "PLATFORM_ADMIN";
  if (!isAdmin && attachment.uploadedByUserId !== req.user?.id) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  if (attachment.storagePath) {
    const absolutePath = path.join(process.cwd(), attachment.storagePath);
    await fsp.unlink(absolutePath).catch(() => null);
  }

  await defectAttachmentRepository.deleteAttachmentRow({
    companyId: req.companyId,
    attachmentId: attachment.id,
  });

  await defectEventRepository.createEvent({
    companyId: req.companyId,
    defectId: attachment.defectId,
    actorUserId: req.user.id,
    type: "ATTACHMENT_DELETED",
    data: { attachmentId: attachment.id },
  });

  res.json({ ok: true });
});

module.exports = {
  listDefectAttachments,
  downloadDefectAttachment,
  uploadDefectAttachment,
  deleteDefectAttachment,
};
