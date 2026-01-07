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

const getVehicle = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError(400, "Invalid vehicle id", "VALIDATION_ERROR");
  }
  const vehicle = await vehicleRepository.getVehicleById(req.companyId, id);
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found", "NOT_FOUND");
  }
  res.json({ vehicle });
});

const updateVehicle = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    throw new AppError(400, "Invalid vehicle id", "VALIDATION_ERROR");
  }

  const data = {};

  if (req.body.regNumber !== undefined) {
    const regNumber = String(req.body.regNumber).trim();
    if (!regNumber) {
      throw new AppError(400, "Registration number is required", "VALIDATION_ERROR");
    }
    data.regNumber = regNumber;
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    data.name = name;
  }

  if (req.body.active !== undefined) {
    if (typeof req.body.active !== "boolean") {
      throw new AppError(400, "Active must be a boolean", "VALIDATION_ERROR");
    }
    data.active = req.body.active;
  }

  try {
    const vehicle = await vehicleRepository.updateVehicle(req.companyId, id, data);
    if (!vehicle) {
      throw new AppError(404, "Vehicle not found", "NOT_FOUND");
    }
    res.json({ vehicle });
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err?.code === "P2002") {
      throw new AppError(409, "Vehicle regNumber already exists", "VEHICLE_REGNUMBER_TAKEN");
    }
    throw err;
  }
});

module.exports = {
  createVehicle,
  listVehicles,
  getVehicle,
  updateVehicle,
};
