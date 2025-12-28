// src/config/prismaClient.js
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

// Ensure DATABASE_URL is available (dotenv/env validation should already run before this file is imported)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required but was not found in process.env");
}

// In dev with nodemon/hot reload, keep a single pool/client on globalThis to avoid exhausting connections.
const globalForPrisma = globalThis;

if (!globalForPrisma.__pgPool) {
  globalForPrisma.__pgPool = new Pool({ connectionString });
}

if (!globalForPrisma.__prisma) {
  const adapter = new PrismaPg(globalForPrisma.__pgPool);
  globalForPrisma.__prisma = new PrismaClient({ adapter });
}

const prisma = globalForPrisma.__prisma;

module.exports = prisma;
