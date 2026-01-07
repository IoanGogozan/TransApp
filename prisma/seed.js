/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config();

const prisma = require("../src/config/prismaClient");
const { hashPassword } = require("../src/utils/password");

const DEMO_COMPANY_NAME = "Demo Transport AS";
const DEMO_COMPANY_SLUG = "demo";
const SEED_PASSWORD = "Password123!";
const SEED_VEHICLES = [
  { regNumber: "AB12345", name: "Truck 1", type: "Truck" },
  { regNumber: "CD67890", name: "Van 1", type: "Van" },
];
const CHECKLIST_DATE = new Date("2024-01-01");
const DEFECT_QUESTION_KEY = "walkaround.brake_lights";

const ensureDatabaseUrl = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run seed");
  }
};

const normalizeEmail = (s) => s.trim().toLowerCase();
const normalizePhone = (s) => {
  const trimmed = s.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
};

const upsertCompany = async () => {
  const existing = await prisma.company.findUnique({
    where: { slug: DEMO_COMPANY_SLUG },
  });

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: { name: DEMO_COMPANY_NAME },
    });
  }

  return prisma.company.create({
    data: { name: DEMO_COMPANY_NAME, slug: DEMO_COMPANY_SLUG },
  });
};

const upsertSubscription = async (companyId) => {
  const existing = await prisma.subscription.findUnique({
    where: { companyId },
  });
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const data = {
    companyId,
    plan: "BASIC",
    status: "TRIALING",
    trialStart: now,
    trialEnd,
  };

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscription.create({ data });
};

const upsertCompanyAdmin = async (companyId) => {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const email = normalizeEmail("admin@demo.no");
  const existing = await prisma.user.findFirst({
    where: { companyId, email },
  });

  const data = {
    companyId,
    email,
    role: "ADMIN",
    passwordHash,
    isActive: true,
    mustChangePassword: false,
  };

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true, email: true, role: true },
    });
  }

  return prisma.user.create({
    data,
    select: { id: true, email: true, role: true },
  });
};

const upsertCompanyDriver = async (companyId) => {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const phone = normalizePhone("+4700000000");
  const existing = await prisma.user.findFirst({
    where: { companyId, phone },
  });

  const data = {
    companyId,
    phone,
    email: null,
    username: null,
    role: "DRIVER",
    passwordHash,
    isActive: true,
    mustChangePassword: true,
  };

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true, phone: true, role: true },
    });
  }

  return prisma.user.create({
    data,
    select: { id: true, phone: true, role: true },
  });
};

const upsertPlatformAdmin = async () => {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const email = normalizeEmail("platform@transapp.no");
  const existing = await prisma.user.findFirst({
    where: { companyId: null, email },
  });

  const data = {
    companyId: null,
    email,
    role: "PLATFORM_ADMIN",
    passwordHash,
    isActive: true,
    mustChangePassword: false,
  };

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data,
      select: { id: true, email: true, role: true },
    });
  }

  return prisma.user.create({
    data,
    select: { id: true, email: true, role: true },
  });
};

const upsertVehicles = async (companyId) => {
  const vehicles = {};

  for (const vehicle of SEED_VEHICLES) {
    const record = await prisma.vehicle.upsert({
      where: {
        companyId_regNumber: {
          companyId,
          regNumber: vehicle.regNumber,
        },
      },
      update: {
        name: vehicle.name,
        type: vehicle.type,
        active: true,
      },
      create: {
        companyId,
        regNumber: vehicle.regNumber,
        name: vehicle.name,
        type: vehicle.type,
      },
    });
    vehicles[vehicle.regNumber] = record;
  }

  return vehicles;
};

const upsertChecklistInstance = async ({ companyId, vehicleId, userId }) =>
  prisma.checklistInstance.upsert({
    where: {
      companyId_vehicleId_date: {
        companyId,
        vehicleId,
        date: CHECKLIST_DATE,
      },
    },
    update: {
      userId,
    },
    create: {
      companyId,
      vehicleId,
      userId,
      date: CHECKLIST_DATE,
    },
  });

const upsertDefect = async ({ companyId, vehicleId, reportedByUserId, assignedToUserId, checklistInstanceId }) => {
  const existing = await prisma.defect.findFirst({
    where: {
      companyId,
      checklistInstanceId,
      checklistQuestionKey: DEFECT_QUESTION_KEY,
    },
  });

  const data = {
    companyId,
    vehicleId,
    reportedByUserId,
    assignedToUserId,
    checklistInstanceId,
    checklistQuestionKey: DEFECT_QUESTION_KEY,
    title: "Brake light not working",
    description: "Reported during daily walkaround.",
    status: "OPEN",
    source: "MANUAL",
  };

  if (existing) {
    return prisma.defect.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.defect.create({ data });
};

const main = async () => {
  ensureDatabaseUrl();

  const company = await upsertCompany();
  await upsertSubscription(company.id);
  const admin = await upsertCompanyAdmin(company.id);
  const driver = await upsertCompanyDriver(company.id);
  const platformAdmin = await upsertPlatformAdmin();
  const vehicles = await upsertVehicles(company.id);

  const checklistInstance = await upsertChecklistInstance({
    companyId: company.id,
    vehicleId: vehicles.AB12345.id,
    userId: driver.id,
  });

  await upsertDefect({
    companyId: company.id,
    vehicleId: vehicles.AB12345.id,
    reportedByUserId: driver.id,
    assignedToUserId: admin.id,
    checklistInstanceId: checklistInstance.id,
  });

  console.log("Seed data ready:");
  console.log(`Company: ${company.name} (slug: ${company.slug})`);
  console.log("Admin login:");
  console.log(" - URL:       /c/demo/login");
  console.log(" - identifier admin@demo.no");
  console.log(` - password:  ${SEED_PASSWORD}`);
  console.log("Driver login:");
  console.log(" - URL:       /c/demo/login");
  console.log(" - identifier +4700000000");
  console.log(` - password:  ${SEED_PASSWORD}`);
  console.log("Platform admin (optional):");
  console.log(" - identifier platform@transapp.no");
  console.log(` - password:  ${SEED_PASSWORD}`);
  console.log("Vehicles:");
  console.log(` - ${vehicles.AB12345.regNumber} (${vehicles.AB12345.name})`);
  console.log(` - ${vehicles.CD67890.regNumber} (${vehicles.CD67890.name})`);
};

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (globalThis.__pgPool && typeof globalThis.__pgPool.end === "function") {
      await globalThis.__pgPool.end();
    }
  });
