const express = require("express");
const reportController = require("../controllers/reportController");

const router = express.Router();

router.get("/timesheet", reportController.timesheet);
router.get("/timesheet.csv", reportController.timesheetCsv);

module.exports = router;
