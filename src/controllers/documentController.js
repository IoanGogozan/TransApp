const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const { z } = require("zod");
const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const uploadSchema = z.object({
  title: z.string().trim().min(1),
});

const mimeToExt = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const mapDocument = (doc) => ({
  id: doc.id,
  title: doc.title,
  mimeType: doc.mimeType,
  size: doc.size,
  uploadedByUserId: doc.uploadedByUserId,
  createdAt: doc.createdAt,
});

const ensureCompany = (req) => {
  if (!req.companyId) {
    throw new AppError(400, "Company not found on request", "NO_COMPANY");
  }
};

const uploadDocument = asyncHandler(async (req, res) => {
  ensureCompany(req);
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }
  if (!req.file) {
    throw new AppError(400, "File is required", "VALIDATION_ERROR");
  }

  const ext = mimeToExt[req.file.mimetype];
  if (!ext) {
    throw new AppError(400, "Unsupported file type", "UNSUPPORTED_FILE_TYPE");
  }

  const created = await prisma.document.create({
    data: {
      companyId: req.companyId,
      title: parsed.data.title.trim(),
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: "pending",
      uploadedByUserId: req.user.id,
    },
  });

  const relativePath = path.join("uploads", String(req.companyId), "documents", `${created.id}${ext}`);
  const absolutePath = path.join(process.cwd(), relativePath);
  try {
    await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
    await fsp.writeFile(absolutePath, req.file.buffer);
    const updated = await prisma.document.update({
      where: { id: created.id },
      data: { storagePath: relativePath },
    });
    res.status(201).json({ document: mapDocument(updated) });
  } catch (err) {
    await prisma.document.delete({ where: { id: created.id } }).catch(() => null);
    throw err;
  }
});

const listDocuments = asyncHandler(async (req, res) => {
  ensureCompany(req);
  const documents = await prisma.document.findMany({
    where: { companyId: req.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      mimeType: true,
      size: true,
      uploadedByUserId: true,
      createdAt: true,
    },
  });
  res.json({ documents: documents.map(mapDocument) });
});

const downloadDocument = asyncHandler(async (req, res) => {
  ensureCompany(req);
  const { id } = req.params;
  const doc = await prisma.document.findFirst({
    where: { id, companyId: req.companyId },
  });
  if (!doc) {
    throw new AppError(404, "Document not found", "NOT_FOUND");
  }

  const absolutePath = path.join(process.cwd(), doc.storagePath);
  try {
    await fsp.stat(absolutePath);
  } catch (err) {
    throw new AppError(404, "File not found", "FILE_NOT_FOUND");
  }

  const extension = path.extname(doc.storagePath);
  const safeTitle = doc.title.replace(/[\\/:*?"<>|]+/g, "_");
  const filename = `${safeTitle || "document"}${extension}`;

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  fs.createReadStream(absolutePath).pipe(res);
});

const deleteDocument = asyncHandler(async (req, res) => {
  ensureCompany(req);
  const { id } = req.params;
  const doc = await prisma.document.findFirst({
    where: { id, companyId: req.companyId },
  });
  if (!doc) {
    throw new AppError(404, "Document not found", "NOT_FOUND");
  }

  if (doc.storagePath) {
    const absolutePath = path.join(process.cwd(), doc.storagePath);
    await fsp.unlink(absolutePath).catch(() => null);
  }

  await prisma.document.delete({ where: { id: doc.id } });
  res.json({ ok: true });
});

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
};
