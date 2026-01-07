const express = require("express");
const requireRole = require("../middlewares/requireRole");
const requireActiveSubscription = require("../middlewares/requireActiveSubscription");
const { listWorkRunTimesheets, listWorkRunDetails } = require("../controllers/timesheetAdminController");

// Endpoints summary (used by frontend admin timesheets):
// GET /api/v1/timesheets
// - Returns { timesheets: [{ date, driver { id, email, phone, username }, route?, totalsMinutes, overtimeType, overtimeReason }] }
// GET /api/v1/timesheets/work-runs
// - Returns { timesheets: [{ date, driver { id, email, phone, username }, totalsMinutes, routes[], vehicles[], customers[], runsCount }] }
// GET /api/v1/timesheets/work-runs/details
// - Returns { date, driverId, runs[] } with runs including customerOption/routeOption/vehicle for display.

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.use(requireActiveSubscription);
router.get("/", listWorkRunTimesheets);
router.get("/work-runs", listWorkRunTimesheets);
router.get("/work-runs/details", listWorkRunDetails);

module.exports = router;
