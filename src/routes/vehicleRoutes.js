const express = require("express");
const { createVehicle, listVehicles, getVehicle } = require("../controllers/vehicleController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.get("/", listVehicles);
router.get("/:id", getVehicle);
router.post("/", requireRole("PLATFORM_ADMIN", "ADMIN"), createVehicle);

module.exports = router;
