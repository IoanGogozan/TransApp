const express = require("express");
const prisma = require("../config/prismaClient");
const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    env: env.nodeEnv,
    uptime: process.uptime(),
  });
});

router.get(
  "/db",
  asyncHandler(async (req, res) => {
    if (env.nodeEnv === "production") {
      return res.status(404).json({ message: "Not available in production" });
    }

    const url = new URL(env.databaseUrl);
    const databaseName = url.pathname ? url.pathname.replace(/^\//, "") : "";

    const [companiesCount, usersCount, vehiclesCount, slugs] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.vehicle.count(),
      prisma.company.findMany({
        select: { slug: true },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
    ]);

    res.json({
      env: env.nodeEnv,
      database: { name: databaseName },
      counts: {
        companies: companiesCount,
        users: usersCount,
        vehicles: vehiclesCount,
      },
      exampleSlugs: slugs.map((c) => c.slug),
    });
  })
);

module.exports = router;
