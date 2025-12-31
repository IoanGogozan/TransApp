const { z } = require("zod");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const prisma = require("../config/prismaClient");

const listCustomers = asyncHandler(async (req, res) => {
  const customers = await prisma.customerOption.findMany({
    where: { companyId: req.companyId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json({ customers });
});

const createSchema = z.object({
  name: z.string().trim().min(1),
  sortOrder: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

const ensureUniqueName = async ({ companyId, name, excludeId }) => {
  if (!name) return;
  const existing = await prisma.customerOption.findFirst({
    where: {
      companyId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(409, "Customer name already exists", "CUSTOMER_NAME_TAKEN");
  }
};

const createCustomer = asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const name = parsed.data.name.trim();
  await ensureUniqueName({ companyId: req.companyId, name });

  try {
    const customer = await prisma.customerOption.create({
      data: {
        companyId: req.companyId,
        name,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });
    res.status(201).json({ customer });
  } catch (err) {
    if (err?.code === "P2002") {
      throw new AppError(409, "Customer name already exists", "CUSTOMER_NAME_TAKEN");
    }
    throw err;
  }
});

const updateCustomer = asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const id = String(req.params.id || "");
  if (!id) {
    throw new AppError(400, "Invalid customer id", "VALIDATION_ERROR");
  }

  const name = parsed.data.name !== undefined ? parsed.data.name.trim() : undefined;
  await ensureUniqueName({ companyId: req.companyId, name, excludeId: id });

  try {
    const updated = await prisma.customerOption.updateMany({
      where: { id, companyId: req.companyId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    if (updated.count === 0) {
      throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
    }

    const customer = await prisma.customerOption.findFirst({
      where: { id, companyId: req.companyId },
    });

    res.json({ customer });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.code === "P2002") {
      throw new AppError(409, "Customer name already exists", "CUSTOMER_NAME_TAKEN");
    }
    throw err;
  }
});

module.exports = { listCustomers, createCustomer, updateCustomer };
