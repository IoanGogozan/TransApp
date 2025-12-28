const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");
const defectRepository = require("../repositories/defectRepository");
const { recordCreatedEvent, recordStatusChanged } = require("./defectWorkflowService");

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
  return defectRepository.listDefects({
    companyId: company,
    status: filters.status,
    vehicleId: filters.vehicleId ? Number(filters.vehicleId) : undefined,
    reportedByUserId: filters.reportedByUserId ? Number(filters.reportedByUserId) : undefined,
    from: filters.from ? new Date(filters.from) : undefined,
    to: filters.to ? new Date(filters.to) : undefined,
    limit,
    offset,
  });
};

const getDefect = async ({ companyId, user, defectId }) => {
  const defect = await defectRepository.findDefectById({ companyId: Number(companyId), defectId });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  return defect;
};

const setStatus = async ({ companyId, user, defectId, status }) => {
  const company = Number(companyId);
  const resolvedAt = ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null;

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

module.exports = {
  createManualDefect,
  listDefects,
  getDefect,
  setStatus,
};
