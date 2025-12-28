const express = require("express");
const { createVehicle, listVehicles } = require("../controllers/vehicleController");

const router = express.Router();

router.get("/", listVehicles);
router.post("/", createVehicle);

module.exports = router;
