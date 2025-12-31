const express = require("express");
const healthRoutes = require("./healthRoutes");
const userRoutes = require("./userRoutes");
const vehicleRoutes = require("./vehicleRoutes");
const authRoutes = require("./authRoutes");
const companyRoutes = require("./companyRoutes");
const meRoutes = require("./meRoutes");
const shiftRoutes = require("./shiftRoutes");
const checklistRoutes = require("./checklistRoutes");
const defectRoutes = require("./defectRoutes");
const reportRoutes = require("./reportRoutes");
const publicRoutes = require("./publicRoutes");
const routeRoutes = require("./routeRoutes");
const customerRoutes = require("./customerRoutes");
const timesheetAdminRoutes = require("./timesheetAdminRoutes");
const auth = require("../middlewares/auth");
const companyContext = require("../middlewares/companyContext");

const router = express.Router();

router.use("/public", publicRoutes);
router.use("/health", healthRoutes);
router.use("/c", companyRoutes);
router.use("/auth", authRoutes);
// Protected routes
router.use(auth, companyContext);
router.use("/users", userRoutes);
router.use("/routes", routeRoutes);
router.use("/customers", customerRoutes);
router.use("/timesheets", timesheetAdminRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/me", meRoutes);
router.use("/shifts", shiftRoutes);
router.use("/checklists", checklistRoutes);
router.use("/defects", defectRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
