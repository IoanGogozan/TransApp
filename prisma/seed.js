/* eslint-disable no-console */
const dotenv = require("dotenv");
dotenv.config();

const prisma = require("../src/config/prismaClient");
const { hashPassword } = require("../src/utils/password");

const DEMO_COMPANY_NAME = "Demo Transport AS";
const SEED_PASSWORD = "Password123!";
const SEED_USERS = [
  { email: "owner@demo.no", role: "OWNER" },
  { email: "admin@demo.no", role: "ADMIN" },
  { email: "driver@demo.no", role: "DRIVER" },
];
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

const upsertCompany = async () => {
  const existing = await prisma.company.findFirst({
    where: { name: DEMO_COMPANY_NAME },
  });

  if (existing) return existing;

  return prisma.company.create({
    data: { name: DEMO_COMPANY_NAME },
  });
};

const upsertUsers = async (companyId) => {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const entries = await Promise.all(
    SEED_USERS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          companyId,
          role: user.role,
          passwordHash,
        },
        create: {
          companyId,
          email: user.email,
          role: user.role,
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      })
    )
  );

  const [owner, admin, driver] = entries;
  return { owner, admin, driver };
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
  const users = await upsertUsers(company.id);
  const vehicles = await upsertVehicles(company.id);

  const checklistInstance = await upsertChecklistInstance({
    companyId: company.id,
    vehicleId: vehicles.AB12345.id,
    userId: users.driver.id,
  });

  await upsertDefect({
    companyId: company.id,
    vehicleId: vehicles.AB12345.id,
    reportedByUserId: users.driver.id,
    assignedToUserId: users.admin.id,
    checklistInstanceId: checklistInstance.id,
  });

  console.log("Seed data ready:");
  console.log(`Company: ${company.name}`);
  console.log("Users (email / password):");
  console.log(` - OWNER:  ${users.owner.email} / ${SEED_PASSWORD}`);
  console.log(` - ADMIN:  ${users.admin.email} / ${SEED_PASSWORD}`);
  console.log(` - DRIVER: ${users.driver.email} / ${SEED_PASSWORD}`);
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
