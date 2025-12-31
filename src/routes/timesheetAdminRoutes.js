const express = require("express");
const requireRole = require("../middlewares/requireRole");
const { listTimesheets, listWorkRunTimesheets } = require("../controllers/timesheetAdminController");

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.get("/", listTimesheets);
router.get("/work-runs", listWorkRunTimesheets);

module.exports = router;
