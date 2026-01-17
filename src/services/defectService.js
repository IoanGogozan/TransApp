const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");
const defectRepository = require("../repositories/defectRepository");
const {
  recordAdminNoteUpdated,
  recordCreatedEvent,
  recordDetailsUpdated,
  recordStatusChanged,
} = require("./defectWorkflowService");

const ensureVehicle = async (companyId, vehicleId) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: Number(vehicleId), companyId: Number(companyId) },
    select: { id: true },
  });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");
  }
  return vehicle.id;
};

const createManualDefect = async ({ companyId, user, vehicleId, title, description }) => {
  const company = Number(companyId);
  const vehicle = await ensureVehicle(company, vehicleId);
  const defect = await defectRepository.createDefect({
    companyId: company,
    vehicleId: vehicle,
    reportedByUserId: Number(user.id),
    source: "MANUAL",
    status: "OPEN",
    title,
    description: description || null,
  });
  await recordCreatedEvent({ companyId: company, defectId: defect.id, actorUserId: Number(user.id) });
  return defect;
};

const listDefects = async ({ companyId, user, filters }) => {
  const company = Number(companyId);
  const limit = filters.limit;
  const offset = filters.offset;
  const reportedByUserId =
    user?.role === "DRIVER" ? Number(user.id) : filters.reportedByUserId ? Number(filters.reportedByUserId) : undefined;
  return defectRepository.listDefects({
    companyId: company,
    status: filters.status,
    vehicleId: filters.vehicleId ? Number(filters.vehicleId) : undefined,
    reportedByUserId,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
    includeArchived: filters.includeArchived,
    limit,
    offset,
  });
};

const getDefect = async ({ companyId, user, defectId }) => {
  const defect = await defectRepository.findDefectByIdWithVehicle({ companyId: Number(companyId), defectId });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  if (user?.role === "DRIVER" && Number(defect.reportedByUserId) !== Number(user.id)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  return defect;
};

const setStatus = async ({ companyId, user, defectId, status }) => {
  const company = Number(companyId);
  const resolvedAt = status === "RESOLVED" ? new Date() : null;

  const existing = await defectRepository.findDefectById({ companyId: company, defectId });
  if (!existing) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }

  const updated = await defectRepository.updateStatus({ companyId: company, defectId, status, resolvedAt });
  if (updated.count === 0) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }

  const defect = await defectRepository.findDefectById({ companyId: company, defectId });
  await recordStatusChanged({
    companyId: company,
    defectId,
    actorUserId: Number(user.id),
    from: existing.status,
    to: status,
  });
  return defect;
};

const updateDefectDetails = async ({ companyId, user, defectId, patch }) => {
  const company = Number(companyId);
  const defect = await defectRepository.findDefectById({ companyId: company, defectId });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  if (defect.archivedAt) {
    throw new AppError(409, "Defect is archived", "ARCHIVED");
  }

  const role = user?.role;
  const isAdmin = role === "ADMIN" || role === "PLATFORM_ADMIN";
  if (isAdmin) {
    // allowed
  } else if (role === "DRIVER") {
    const isOwner = Number(defect.reportedByUserId) === Number(user?.id);
    if (!isOwner) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }
  } else {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  const changedTitle = patch.title !== undefined && patch.title !== defect.title;
  const currentDescription = defect.description ?? null;
  const nextDescription = patch.description !== undefined ? patch.description : undefined;
  const changedDescription = nextDescription !== undefined && nextDescription !== currentDescription;

  const updateResult = await defectRepository.updateDetails({
    companyId: company,
    defectId,
    title: patch.title,
    description: patch.description,
  });

  if (updateResult.count === 0) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }

  const updated = await defectRepository.findDefectByIdWithVehicle({ companyId: company, defectId });

  await recordDetailsUpdated({
    companyId: company,
    defectId,
    actorUserId: Number(user.id),
    changed: { title: changedTitle, description: changedDescription },
  });

  return updated;
};

const updateAdminNote = async ({ companyId, user, defectId, adminNote }) => {
  const company = Number(companyId);
  const defect = await defectRepository.findDefectById({ companyId: company, defectId });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  if (defect.status === "RESOLVED") {
    throw new AppError(409, "Defect is resolved", "DEFECT_RESOLVED");
  }
  if (
    defect.adminNoteUpdatedByUserId != null &&
    Number(defect.adminNoteUpdatedByUserId) !== Number(user.id) &&
    user?.role !== "PLATFORM_ADMIN"
  ) {
    throw new AppError(403, "Admin note can only be edited by its author.", "FORBIDDEN");
  }

  const trimmed = typeof adminNote === "string" ? adminNote.trim() : null;
  const nextNote = trimmed ? trimmed : null;

  const updateResult = await defectRepository.updateAdminNote({
    companyId: company,
    defectId,
    adminNote: nextNote,
    adminNoteUpdatedAt: nextNote ? new Date() : null,
    adminNoteUpdatedByUserId: Number(user.id),
  });

  if (updateResult.count === 0) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }

  const updated = await defectRepository.findDefectById({ companyId: company, defectId });

  await recordAdminNoteUpdated({
    companyId: company,
    defectId,
    actorUserId: Number(user.id),
  });

  return updated;
};

module.exports = {
  createManualDefect,
  listDefects,
  getDefect,
  setStatus,
  updateDefectDetails,
  updateAdminNote,
};
