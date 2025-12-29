const prisma = require("../../src/config/prismaClient");
const { hashPassword } = require("../../src/utils/password");
const { generateUniqueSlug } = require("../../src/utils/slugify");

let counter = 1;
const unique = () => `${Date.now()}_${counter++}`;

const normalizeEmail = (s) => s.trim().toLowerCase();
const normalizePhone = (s) => {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
};
const normalizeUsername = (s) => s.trim().toLowerCase();

const createCompany = async ({ name, plan } = {}) => {
  const companyName = name || `Test Company ${unique()}`;
  const slug = await generateUniqueSlug(companyName, async (candidate) => {
    const existing = await prisma.company.findUnique({ where: { slug: candidate }, select: { id: true } });
    return Boolean(existing);
  });
  return prisma.company.create({
    data: { name: companyName, plan: plan || "BASIC", slug },
  });
};

const createUser = async ({
  companyId,
  email,
  phone,
  username,
  role = "DRIVER",
  passwordPlain = "Password123!",
  active = true,
  mustChangePassword = false,
}) => {
  const passwordHash = await hashPassword(passwordPlain);
  const userEmail = email === undefined ? `user+${unique()}@example.com` : email;
  const roleToUse = role === "OWNER" ? "PLATFORM_ADMIN" : role;

  const data = {
    companyId,
    role: roleToUse,
    passwordHash,
    isActive: active,
    mustChangePassword,
  };

  if (userEmail !== null) {
    data.email = normalizeEmail(userEmail);
  }
  if (phone !== undefined) {
    data.phone = phone === null ? null : normalizePhone(phone);
  }
  if (username !== undefined) {
    data.username = username === null ? null : normalizeUsername(username);
  }

  return prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      username: true,
      role: true,
      companyId: true,
      mustChangePassword: true,
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
