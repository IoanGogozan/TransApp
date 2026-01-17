const prisma = require("../config/prismaClient");

const createEvent = async ({ companyId, defectId, actorUserId, type, data }) =>
  prisma.defectEvent.create({
    data: {
      companyId,
      defectId,
      actorUserId,
      type,
      data: data || null,
    },
    select: {
      id: true,
      companyId: true,
      defectId: true,
      actorUserId: true,
      type: true,
      data: true,
      createdAt: true,
    },
  });

const listEvents = async ({ companyId, defectId, limit, offset }) =>
  prisma.defectEvent.findMany({
    where: { companyId, defectId },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
    include: {
      actor: {
        select: {
          id: true,
          phone: true,
          username: true,
          email: true,
        },
      },
    },
  });

module.exports = {
  createEvent,
  listEvents,
};
