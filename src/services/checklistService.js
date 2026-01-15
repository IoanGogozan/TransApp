const { Prisma } = require("@prisma/client");
const AppError = require("../utils/AppError");
const checklistRepository = require("../repositories/checklistRepository");
const prisma = require("../config/prismaClient");
const { isValidQuestionKey } = require("../config/checklistQuestions");
const defectRepository = require("../repositories/defectRepository");
const { recordCreatedEvent } = require("./defectWorkflowService");

const osloFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const todayOsloDate = () => osloFormatter.format(new Date());

const parseDateOnly = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

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

const getStatus = async ({ companyId, user, vehicleId, date }) => {
  const dateValue = parseDateOnly(date || todayOsloDate());
  const existing = await checklistRepository.findInstanceByVehicleAndDate({
    companyId: Number(companyId),
    vehicleId: Number(vehicleId),
    date: dateValue,
    ...(user.role === "DRIVER" ? { userId: Number(user.id) } : {}),
  });
  return {
    done: Boolean(existing),
    checklistId: existing ? existing.id : undefined,
  };
};

const submitChecklist = async ({ companyId, user, vehicleId, date, answers }) => {
  const company = Number(companyId);
  const userId = Number(user.id);
  const vehicleIdNumber = Number(vehicleId);

  await ensureVehicle(company, vehicleIdNumber);

  const dateValue = parseDateOnly(date || todayOsloDate());

  const existing = await checklistRepository.findInstanceByVehicleAndDate({
    companyId: company,
    vehicleId: vehicleIdNumber,
    date: dateValue,
    userId,
  });
  if (existing) {
    throw new AppError(409, "Checklist already submitted", "CHECKLIST_ALREADY_SUBMITTED");
  }

  const preparedAnswers = answers.map((a) => {
    if (!isValidQuestionKey(a.questionKey)) {
      throw new AppError(400, "Unknown question key", "CHECKLIST_UNKNOWN_QUESTION");
    }
    return {
      questionKey: a.questionKey,
      answer: a.answer,
      comment: a.comment || null,
      hasDeviation: a.answer === "DEVIATION",
    };
  });

  const checklist = await checklistRepository.createChecklistWithAnswers({
    companyId: company,
    vehicleId: vehicleIdNumber,
    userId,
    date: dateValue,
    answers: preparedAnswers,
  });

  const createdDefectIds = [];
  // Auto-create defects for deviations
  const deviations = preparedAnswers.filter((a) => a.answer === "DEVIATION");
  for (const dev of deviations) {
    try {
      const defect = await defectRepository.createDefect({
        companyId: company,
        vehicleId: vehicleIdNumber,
        reportedByUserId: userId,
        source: "CHECKLIST",
        status: "OPEN",
        title: `Checklist deviation: ${dev.questionKey}`,
        description: dev.comment || null,
        checklistInstanceId: checklist.id,
        checklistQuestionKey: dev.questionKey,
      });
      await recordCreatedEvent({
        companyId: company,
        defectId: defect.id,
        actorUserId: userId,
      });
      createdDefectIds.push(defect.id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Ignore duplicates due to unique constraint
        continue;
      }
      throw err;
    }
  }

  return { checklist, createdDefectIds };
};

const listChecklists = async ({ companyId, user, from, to, vehicleId, userId, limit, offset }) => {
  const company = Number(companyId);
  let effectiveUserId = userId ? Number(userId) : undefined;
  if (user.role === "DRIVER") {
    effectiveUserId = Number(user.id);
  }

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const fromDate = from ? parseDateOnly(from) : defaultFrom;
  const toDate = to ? parseDateOnly(to) : now;

  return checklistRepository.listChecklists({
    companyId: company,
    from: fromDate,
    to: toDate,
    vehicleId: vehicleId ? Number(vehicleId) : undefined,
    userId: effectiveUserId,
    limit,
    offset,
  });
};

const getChecklist = async ({ companyId, user, checklistId }) => {
  const company = Number(companyId);
  const checklist = await checklistRepository.findChecklistById({ companyId: company, checklistId });
  if (!checklist) {
    throw new AppError(404, "Checklist not found", "CHECKLIST_NOT_FOUND");
  }
  if (user.role === "DRIVER" && checklist.userId !== Number(user.id)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  return checklist;
};

module.exports = {
  getStatus,
  submitChecklist,
  listChecklists,
  getChecklist,
};
