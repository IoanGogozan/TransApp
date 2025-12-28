const express = require("express");
const shiftController = require("../controllers/shiftController");

const router = express.Router();

router.post("/start", shiftController.startShift);
router.post("/:id/end", shiftController.endShift);
router.get("/", shiftController.listShifts);
router.get("/:id", shiftController.getShift);

module.exports = router;
