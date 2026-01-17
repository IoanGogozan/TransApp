const prisma = require("../config/prismaClient");

const baseSelect = {
  id: true,
  companyId: true,
  vehicleId: true,
  reportedByUserId: true,
  assignedToUserId: true,
  checklistInstanceId: true,
  checklistQuestionKey: true,
  source: true,
  status: true,
  title: true,
  description: true,
  adminNote: true,
  adminNoteUpdatedAt: true,
  adminNoteUpdatedByUserId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
};

const detailSelect = {
  ...baseSelect,
  vehicle: {
    select: {
      id: true,
      regNumber: true,
      name: true,
    },
  },
  reportedByUser: {
    select: {
      id: true,
      phone: true,
      username: true,
      email: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      phone: true,
      username: true,
      email: true,
    },
  },
};

const listSelect = {
  ...baseSelect,
  vehicle: {
    select: {
      id: true,
      regNumber: true,
      name: true,
    },
  },
  attachments: {
    where: { purgedAt: null },
    orderBy: { createdAt: "asc" },
    take: 1,
    select: {
      id: true,
      mimeType: true,
      purgedAt: true,
      createdAt: true,
    },
  },
  reportedByUser: {
    select: {
      id: true,
      phone: true,
      username: true,
      email: true,
    },
  },
  assignedToUser: {
    select: {
      id: true,
      phone: true,
      username: true,
      email: true,
    },
  },
};

const createDefect = async (data) =>
  prisma.defect.create({
    data,
    select: baseSelect,
  });

const findDefectById = async ({ companyId, defectId }) =>
  prisma.defect.findFirst({
    where: { companyId, id: defectId },
    select: baseSelect,
  });

const findDefectByIdWithVehicle = async ({ companyId, defectId }) =>
  prisma.defect.findFirst({
    where: { companyId, id: defectId },
    select: detailSelect,
  });

const listDefects = async ({
  companyId,
  status,
  vehicleId,
  reportedByUserId,
  from,
  to,
  includeArchived,
  limit,
  offset,
}) =>
  prisma.defect.findMany({
    where: {
      companyId,
      ...(status ? { status } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(reportedByUserId ? { reportedByUserId } : {}),
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    select: listSelect,
  });

const updateStatus = async ({ companyId, defectId, status, resolvedAt }) =>
  prisma.defect.updateMany({
    where: { id: defectId, companyId },
    data: { status, resolvedAt },
  });

const updateDetails = async ({ companyId, defectId, title, description }) =>
  prisma.defect.updateMany({
    where: { id: defectId, companyId, archivedAt: null },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

const updateAdminNote = async ({
  companyId,
  defectId,
  adminNote,
  adminNoteUpdatedAt,
  adminNoteUpdatedByUserId,
}) =>
  prisma.defect.updateMany({
    where: { id: defectId, companyId, archivedAt: null },
    data: { adminNote, adminNoteUpdatedAt, adminNoteUpdatedByUserId },
  });

const setAssignee = async ({ companyId, defectId, assignedToUserId }) =>
  prisma.defect.updateMany({
    where: { id: defectId, companyId },
    data: { assignedToUserId },
  });

module.exports = {
  createDefect,
  findDefectById,
  findDefectByIdWithVehicle,
  listDefects,
  updateStatus,
  updateDetails,
  updateAdminNote,
  setAssignee,
};
