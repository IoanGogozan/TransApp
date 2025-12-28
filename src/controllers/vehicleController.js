const { z } = require("zod");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const vehicleRepository = require("../repositories/vehicleRepository");

const vehicleSchema = z.object({
  regNumber: z.string().trim().min(1, "Registration number is required"),
  name: z.string().trim().min(1, "Name is required"),
  type: z.string().trim().min(1, "Type is required"),
});

const createVehicle = asyncHandler(async (req, res) => {
  const parsed = vehicleSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.format());
  }

  const vehicle = await vehicleRepository.createVehicle(req.companyId, parsed.data);

  res.status(201).json({ vehicle });
});

const listVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleRepository.listVehicles(req.companyId);
  res.json({ vehicles });
});

module.exports = {
  createVehicle,
  listVehicles,
};
