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
const documentAdminRoutes = require("./documentAdminRoutes");
const webhookRoutes = require("./webhookRoutes");
const createRateLimiter = require("../middleware/rateLimiterGeneral");
const auth = require("../middlewares/auth");
const companyContext = require("../middlewares/companyContext");
const subscriptionContext = require("../middlewares/subscriptionContext");
const requireActiveSubscription = require("../middlewares/requireActiveSubscription");
const { csrfProtection } = require("../middlewares/csrfProtection");

const router = express.Router();
const webhookLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 300 });

router.use("/public", publicRoutes);
router.use("/health", healthRoutes);
router.use("/webhooks", webhookLimiter, webhookRoutes);
router.use("/c", companyRoutes);
router.use("/auth", authRoutes);
// Protected routes
router.use(auth, csrfProtection, companyContext, subscriptionContext);
router.use("/users", userRoutes);
router.use("/routes", requireActiveSubscription, routeRoutes);
router.use("/customers", requireActiveSubscription, customerRoutes);
router.use("/timesheets", requireActiveSubscription, timesheetAdminRoutes);
router.use("/admin/documents", requireActiveSubscription, documentAdminRoutes);
router.use("/vehicles", requireActiveSubscription, vehicleRoutes);
router.use("/me", meRoutes);
router.use("/shifts", requireActiveSubscription, shiftRoutes);
router.use("/checklists", requireActiveSubscription, checklistRoutes);
router.use("/defects", requireActiveSubscription, defectRoutes);
router.use("/reports", requireActiveSubscription, reportRoutes);

module.exports = router;
