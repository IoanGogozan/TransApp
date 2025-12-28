const prisma = require("../config/prismaClient");

const listClosedShiftsForReport = async ({ companyId, fromUtc, toUtc, userId, vehicleId }) =>
  prisma.shift.findMany({
    where: {
      companyId,
      endAt: { not: null },
      startAt: {
        gte: fromUtc,
        lt: toUtc,
      },
      ...(userId ? { userId } : {}),
      ...(vehicleId ? { vehicleId } : {}),
    },
    select: {
      startAt: true,
      endAt: true,
      userId: true,
      vehicleId: true,
    },
    orderBy: { startAt: "asc" },
  });

module.exports = {
  listClosedShiftsForReport,
};
