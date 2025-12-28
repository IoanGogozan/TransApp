const express = require("express");
const healthRoutes = require("./healthRoutes");
const userRoutes = require("./userRoutes");
const vehicleRoutes = require("./vehicleRoutes");
const authRoutes = require("./authRoutes");
const meRoutes = require("./meRoutes");
const shiftRoutes = require("./shiftRoutes");
const checklistRoutes = require("./checklistRoutes");
const defectRoutes = require("./defectRoutes");
const reportRoutes = require("./reportRoutes");
const auth = require("../middlewares/auth");
const companyContext = require("../middlewares/companyContext");

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
// Protected routes
router.use(auth, companyContext);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/me", meRoutes);
router.use("/shifts", shiftRoutes);
router.use("/checklists", checklistRoutes);
router.use("/defects", defectRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
