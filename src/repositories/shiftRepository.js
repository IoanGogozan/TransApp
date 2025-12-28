const prisma = require("../config/prismaClient");
const AppError = require("../utils/AppError");

const baseSelect = {
  id: true,
  companyId: true,
  userId: true,
  vehicleId: true,
  startAt: true,
  endAt: true,
  notes: true,
};

const findActiveShiftByUser = async ({ companyId, userId }) =>
  prisma.shift.findFirst({
    where: { companyId, userId, endAt: null },
    select: baseSelect,
    orderBy: { startAt: "desc" },
  });

const createShift = async ({ companyId, userId, vehicleId, startAt, notes }) =>
  prisma.shift.create({
    data: {
      companyId,
      userId,
      vehicleId: vehicleId || null,
      startAt,
      notes,
    },
    select: baseSelect,
  });

const findShiftById = async ({ companyId, shiftId }) =>
  prisma.shift.findFirst({
    where: { companyId, id: Number(shiftId) },
    select: baseSelect,
  });

const endShift = async ({ companyId, shiftId, endAt }) => {
  const result = await prisma.shift.updateMany({
    where: { id: Number(shiftId), companyId },
    data: { endAt },
  });

  if (result.count === 0) {
    throw new AppError(404, "Shift not found", "SHIFT_NOT_FOUND");
  }

  return findShiftById({ companyId, shiftId });
};

const listShifts = async ({ companyId, from, to, userId, limit, offset }) =>
  prisma.shift.findMany({
    where: {
      companyId,
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startAt: "desc" },
    take: limit,
    skip: offset,
    select: baseSelect,
  });

module.exports = {
  findActiveShiftByUser,
  createShift,
  findShiftById,
  endShift,
  listShifts,
};
