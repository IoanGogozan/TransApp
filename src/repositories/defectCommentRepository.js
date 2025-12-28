const prisma = require("../config/prismaClient");

const createComment = async ({ companyId, defectId, userId, message }) =>
  prisma.defectComment.create({
    data: { companyId, defectId, userId, message },
    select: {
      id: true,
      companyId: true,
      defectId: true,
      userId: true,
      message: true,
      createdAt: true,
    },
  });

const listComments = async ({ companyId, defectId, limit, offset }) =>
  prisma.defectComment.findMany({
    where: { companyId, defectId },
    orderBy: { createdAt: "asc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      companyId: true,
      defectId: true,
      userId: true,
      message: true,
      createdAt: true,
    },
  });

module.exports = {
  createComment,
  listComments,
};
