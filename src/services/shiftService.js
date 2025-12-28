const AppError = require("../utils/AppError");
const shiftRepository = require("../repositories/shiftRepository");
const prisma = require("../config/prismaClient");
const { existsInstanceByVehicleAndDate } = require("../repositories/checklistRepository");
const { osloDateOnly } = require("../utils/time");

const ensureVehicle = async (companyId, vehicleId) => {
  if (!vehicleId) return null;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: Number(vehicleId), companyId },
    select: { id: true },
  });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");
  }
  return vehicle.id;
};

const startShift = async ({ companyId, user, vehicleId, startAt, notes }) => {
  const company = Number(companyId);
  const userId = Number(user.id);
  const existing = await shiftRepository.findActiveShiftByUser({ companyId: company, userId });
  if (existing) {
    throw new AppError(409, "Shift already active", "SHIFT_ALREADY_ACTIVE");
  }

  const vehicleIdChecked = await ensureVehicle(company, vehicleId);
  const start = startAt ? new Date(startAt) : new Date();

  if (vehicleIdChecked) {
    const checklistDate = osloDateOnly(start);
    const hasChecklist = await existsInstanceByVehicleAndDate({
      companyId: company,
      vehicleId: vehicleIdChecked,
      date: checklistDate,
    });
    if (!hasChecklist) {
      throw new AppError(409, "CHECKLIST_REQUIRED", "CHECKLIST_REQUIRED", {
        vehicleId: vehicleIdChecked,
        date: checklistDate,
      });
    }
  }

  return shiftRepository.createShift({
    companyId: company,
    userId,
    vehicleId: vehicleIdChecked,
    startAt: start,
    notes,
  });
};

const endShift = async ({ companyId, user, shiftId, endAt }) => {
  const company = Number(companyId);
  const userId = Number(user.id);
  const shift = await shiftRepository.findShiftById({ companyId: company, shiftId });
  if (!shift) {
    throw new AppError(404, "Shift not found", "SHIFT_NOT_FOUND");
  }

  if (user.role === "DRIVER" && shift.userId !== userId) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }

  if (shift.endAt) {
    throw new AppError(409, "Shift already ended", "SHIFT_ALREADY_ENDED");
  }

  const endTime = endAt ? new Date(endAt) : new Date();

  if (endTime <= new Date(shift.startAt)) {
    throw new AppError(400, "End time must be after start time", "SHIFT_INVALID_END_TIME");
  }

  return shiftRepository.endShift({
    companyId: company,
    shiftId,
    endAt: endTime,
  });
};

const listShifts = async ({ companyId, user, from, to, userId, limit, offset }) => {
  const company = Number(companyId);
  let effectiveUserId = userId;
  if (user.role === "DRIVER") {
    effectiveUserId = Number(user.id);
  }

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : now;

  return shiftRepository.listShifts({
    companyId: company,
    from: fromDate,
    to: toDate,
    userId: effectiveUserId,
    limit,
    offset,
  });
};

const getShiftById = async ({ companyId, user, shiftId }) => {
  const company = Number(companyId);
  const userId = Number(user.id);
  const shift = await shiftRepository.findShiftById({ companyId: company, shiftId });
  if (!shift) {
    throw new AppError(404, "Shift not found", "SHIFT_NOT_FOUND");
  }
  if (user.role === "DRIVER" && shift.userId !== userId) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  return shift;
};

module.exports = {
  startShift,
  endShift,
  listShifts,
  getShiftById,
};
