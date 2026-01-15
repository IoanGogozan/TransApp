const prisma = require("../config/prismaClient");

const baseChecklistSelect = {
  id: true,
  companyId: true,
  vehicleId: true,
  userId: true,
  date: true,
  createdAt: true,
  answers: {
    select: {
      id: true,
      questionKey: true,
      answer: true,
      comment: true,
      hasDeviation: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
};

const findInstanceByVehicleAndDate = async ({ companyId, vehicleId, date, userId }) =>
  prisma.checklistInstance.findFirst({
    where: {
      companyId,
      vehicleId,
      date,
      ...(userId ? { userId } : {}),
    },
    select: baseChecklistSelect,
  });

const existsInstanceByVehicleAndDate = async ({ companyId, vehicleId, date }) => {
  const dateValue = typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : date;
  const found = await prisma.checklistInstance.findFirst({
    where: { companyId, vehicleId, date: dateValue },
    select: { id: true },
  });
  return Boolean(found);
};

const createChecklistWithAnswers = async ({ companyId, vehicleId, userId, date, answers }) =>
  prisma.$transaction(async (tx) => {
    const checklist = await tx.checklistInstance.create({
      data: {
        companyId,
        vehicleId,
        userId,
        date,
      },
      select: baseChecklistSelect,
    });

    const answersToCreate = answers.map((a) => ({
      checklistInstanceId: checklist.id,
      questionKey: a.questionKey,
      answer: a.answer,
      comment: a.comment || null,
      hasDeviation: a.hasDeviation,
    }));

    await tx.checklistAnswer.createMany({ data: answersToCreate });

    const withAnswers = await tx.checklistInstance.findUnique({
      where: { id: checklist.id },
      select: baseChecklistSelect,
    });

    return withAnswers;
  });

const listChecklists = async ({ companyId, from, to, vehicleId, userId, limit, offset }) =>
  prisma.checklistInstance.findMany({
    where: {
      companyId,
      ...(vehicleId ? { vehicleId } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
    select: baseChecklistSelect,
  });

const findChecklistById = async ({ companyId, checklistId }) =>
  prisma.checklistInstance.findFirst({
    where: { companyId, id: checklistId },
    select: baseChecklistSelect,
  });

module.exports = {
  findInstanceByVehicleAndDate,
  existsInstanceByVehicleAndDate,
  createChecklistWithAnswers,
  listChecklists,
  findChecklistById,
};
