const prisma = require("../../src/config/prismaClient");
const { hashPassword } = require("../../src/utils/password");

let counter = 1;
const unique = () => `${Date.now()}_${counter++}`;

const createCompany = async ({ name } = {}) => {
  const companyName = name || `Test Company ${unique()}`;
  return prisma.company.create({
    data: { name: companyName },
  });
};

const createUser = async ({ companyId, email, role = "DRIVER", passwordPlain = "Password123!", active = true }) => {
  const passwordHash = await hashPassword(passwordPlain);
  const userEmail = email || `user+${unique()}@example.com`;

  return prisma.user.create({
    data: {
      companyId,
      email: userEmail,
      role,
      passwordHash,
      isActive: active,
    },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
    },
  });
};

const createVehicle = async ({ companyId, regNumber, name, type }) => {
  const reg = regNumber || `REG${unique().slice(-6)}`;
  const vehicleName = name || `Vehicle ${unique()}`;
  const vehicleType = type || "Truck";

  return prisma.vehicle.create({
    data: {
      companyId,
      regNumber: reg,
      name: vehicleName,
      type: vehicleType,
    },
  });
};

module.exports = {
  createCompany,
  createUser,
  createVehicle,
};
