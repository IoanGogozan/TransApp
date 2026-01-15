const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");
const defectRepository = require("../repositories/defectRepository");
const defectCommentRepository = require("../repositories/defectCommentRepository");
const defectEventRepository = require("../repositories/defectEventRepository");

const ensureDefect = async (companyId, defectId) => {
  const defect = await defectRepository.findDefectById({ companyId: Number(companyId), defectId });
  if (!defect) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }
  return defect;
};

const ensureDefectAccess = async ({ companyId, defectId, user }) => {
  const defect = await ensureDefect(companyId, defectId);
  if (user?.role === "DRIVER" && Number(defect.reportedByUserId) !== Number(user.id)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN");
  }
  return defect;
};

const ensureUserInCompany = async (companyId, userId) => {
  const user = await prisma.user.findFirst({
    where: { id: Number(userId), companyId: Number(companyId) },
    select: { id: true },
  });
  if (!user) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }
  return user.id;
};

const assignDefect = async ({ companyId, user, defectId, assignedToUserId }) => {
  const defect = await ensureDefect(companyId, defectId);

  let assignee = null;
  if (assignedToUserId !== null && assignedToUserId !== undefined) {
    assignee = await ensureUserInCompany(companyId, assignedToUserId);
  }

  const updateResult = await defectRepository.setAssignee({
    companyId: Number(companyId),
    defectId,
    assignedToUserId: assignee,
  });
  if (updateResult.count === 0) {
    throw new AppError(404, "Defect not found", "DEFECT_NOT_FOUND");
  }

  await defectEventRepository.createEvent({
    companyId: Number(companyId),
    defectId,
    actorUserId: Number(user.id),
    type: assignee ? "ASSIGNED" : "UNASSIGNED",
    data: { assignedToUserId: assignee },
  });

  return defectRepository.findDefectById({ companyId: Number(companyId), defectId });
};

const addComment = async ({ companyId, user, defectId, message }) => {
  await ensureDefectAccess({ companyId, defectId, user });

  const comment = await defectCommentRepository.createComment({
    companyId: Number(companyId),
    defectId,
    userId: Number(user.id),
    message,
  });

  await defectEventRepository.createEvent({
    companyId: Number(companyId),
    defectId,
    actorUserId: Number(user.id),
    type: "COMMENTED",
    data: { commentId: comment.id },
  });

  return comment;
};

const listComments = async ({ companyId, defectId, limit, offset, user }) => {
  await ensureDefectAccess({ companyId, defectId, user });
  return defectCommentRepository.listComments({
    companyId: Number(companyId),
    defectId,
    limit,
    offset,
  });
};

const listHistory = async ({ companyId, defectId, limit, offset, user }) => {
  await ensureDefectAccess({ companyId, defectId, user });
  return defectEventRepository.listEvents({
    companyId: Number(companyId),
    defectId,
    limit,
    offset,
  });
};

const recordCreatedEvent = async ({ companyId, defectId, actorUserId }) =>
  defectEventRepository.createEvent({
    companyId,
    defectId,
    actorUserId,
    type: "CREATED",
    data: null,
  });

const recordStatusChanged = async ({ companyId, defectId, actorUserId, from, to }) =>
  defectEventRepository.createEvent({
    companyId,
    defectId,
    actorUserId,
    type: "STATUS_CHANGED",
    data: { from, to },
  });

const recordDetailsUpdated = async ({ companyId, defectId, actorUserId, changed }) =>
  defectEventRepository.createEvent({
    companyId,
    defectId,
    actorUserId,
    type: "DETAILS_UPDATED",
    data: { changed },
  });

module.exports = {
  ensureDefectAccess,
  assignDefect,
  addComment,
  listComments,
  listHistory,
  recordCreatedEvent,
  recordStatusChanged,
  recordDetailsUpdated,
};
