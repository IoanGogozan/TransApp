const prisma = require("../config/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findFirst({
    where: { id: userId, companyId: req.companyId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    throw new AppError(404, "User not found", "NOT_FOUND");
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      active: user.isActive,
    },
    company: user.company,
  });
});

module.exports = { getMe };
