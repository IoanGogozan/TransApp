const prisma = require("../config/prismaClient");

const listVehicles = async (companyId) => {
  return prisma.vehicle.findMany({
    where: { companyId: Number(companyId) },
    orderBy: { createdAt: "desc" },
  });
};

const createVehicle = async (companyId, data) => {
  return prisma.vehicle.create({
    data: {
      ...data,
      companyId: Number(companyId),
    },
  });
};

const getVehicleById = async (companyId, id) => {
  return prisma.vehicle.findFirst({
    where: { companyId: Number(companyId), id: Number(id) },
  });
};

const updateVehicle = async (companyId, id, data) => {
  const result = await prisma.vehicle.updateMany({
    where: { companyId: Number(companyId), id: Number(id) },
    data,
  });
  if (result.count === 0) return null;
  return prisma.vehicle.findFirst({
    where: { companyId: Number(companyId), id: Number(id) },
  });
};

module.exports = {
  listVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
};
