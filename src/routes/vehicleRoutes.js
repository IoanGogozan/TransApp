const express = require("express");
const { createVehicle, listVehicles, getVehicle, updateVehicle } = require("../controllers/vehicleController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get("/", listVehicles);
router.get("/:id", getVehicle);
router.post("/", requireRole("PLATFORM_ADMIN", "ADMIN"), createVehicle);
router.patch("/:id", requireRole("ADMIN", "PLATFORM_ADMIN"), updateVehicle);

module.exports = router;
