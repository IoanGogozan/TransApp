const prisma = require("../config/prismaClient");

const baseSelect = {
  id: true,
  defectId: true,
  title: true,
  mimeType: true,
  size: true,
  uploadedByUserId: true,
  storagePath: true,
  purgedAt: true,
  createdAt: true,
};

const create = async ({
  companyId,
  defectId,
  uploadedByUserId,
  title,
  mimeType,
  size,
  storagePath,
}) =>
  prisma.defectAttachment.create({
    data: {
      companyId,
      defectId,
      uploadedByUserId,
      title: title ?? null,
      mimeType,
      size,
      storagePath,
    },
    select: baseSelect,
  });

const updateAttachmentPath = async ({ companyId, attachmentId, storagePath }) =>
  prisma.defectAttachment.updateMany({
    where: { companyId, id: attachmentId },
    data: { storagePath },
  });

const listByDefect = async ({ companyId, defectId, limit, offset }) =>
  prisma.defectAttachment.findMany({
    where: { companyId, defectId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: baseSelect,
  });

const findById = async ({ companyId, attachmentId }) =>
  prisma.defectAttachment.findFirst({
    where: { companyId, id: attachmentId },
    select: baseSelect,
  });

const countByDefect = async ({ companyId, defectId }) =>
  prisma.defectAttachment.count({
    where: { companyId, defectId, purgedAt: null },
  });

const markPurged = async ({ companyId, attachmentId, purgedAt }) =>
  prisma.defectAttachment.updateMany({
    where: { companyId, id: attachmentId },
    data: { storagePath: null, purgedAt },
  });

const deleteById = async ({ companyId, attachmentId }) =>
  prisma.defectAttachment.deleteMany({
    where: { companyId, id: attachmentId },
  });

// Backwards-compatible exports
const createAttachment = create;
const listAttachments = listByDefect;
const findAttachmentById = findById;
const countActiveAttachments = countByDefect;
const deleteAttachmentRow = deleteById;

module.exports = {
  countByDefect,
  listByDefect,
  findById,
  create,
  deleteById,
  markPurged,
  // legacy names
  createAttachment,
  updateAttachmentPath,
  listAttachments,
  findAttachmentById,
  countActiveAttachments,
  deleteAttachmentRow,
};
