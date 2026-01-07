// Ensure environment is loaded (respects DOTENV_CONFIG_PATH / NODE_ENV logic)
require("../src/config/env");
const prisma = require("../src/config/prismaClient");

const tables = [
  "work_entries",
  "customer_options",
  "route_options",
  "vehicle_checkins",
  "defect_events",
  "defect_comments",
  "defects",
  "checklist_answers",
  "checklist_instances",
  "documents",
  "shifts",
  "vehicles",
  "users",
  "companies",
  "subscriptions",
  "webhook_events",
];

beforeEach(async () => {
  const truncateSql = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(truncateSql);
});

afterAll(async () => {
  await prisma.$disconnect();
});
