const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");

const booleanQuery = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase();
  if (s === "true") return true;
  if (s === "false") return false;
  return undefined;
};

const listRoutes = asyncHandler(async (req, res) => {
  const active = booleanQuery(req.query?.active);

  const routes = await prisma.routeOption.findMany({
    where: {
      companyId: req.companyId,
      ...(active === undefined ? {} : { active }),
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  });

  res.json({ routes });
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

const createRoute = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  try {
    const route = await prisma.routeOption.create({
      data: {
        companyId: req.companyId,
        name: parsed.data.name.trim(),
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });
    res.status(201).json({ route });
  } catch (err) {
    if (err?.code === "P2002") {
      throw new AppError(409, "Route name already exists", "ROUTE_NAME_TAKEN");
    }
    throw err;
  }
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

const updateRoute = asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const id = String(req.params.id || "");
  if (!id) {
    throw new AppError(400, "Invalid route id", "VALIDATION_ERROR");
  }

  try {
    const updated = await prisma.routeOption.updateMany({
      where: { id, companyId: req.companyId },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    if (updated.count === 0) {
      throw new AppError(404, "Route not found", "ROUTE_NOT_FOUND");
    }

    const route = await prisma.routeOption.findFirst({
      where: { id, companyId: req.companyId },
    });

    res.json({ route });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.code === "P2002") {
      throw new AppError(409, "Route name already exists", "ROUTE_NAME_TAKEN");
    }
    throw err;
  }
});

module.exports = { listRoutes, createRoute, updateRoute };
