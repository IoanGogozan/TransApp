const express = require("express");
const { loginWithCompanySlug } = require("../controllers/authController");
const { getPublicCompany } = require("../controllers/companyController");
const loginRateLimit = require("../middleware/loginRateLimit");
const billingRoutes = require("./billingRoutes");
const auth = require("../middlewares/auth");
const { csrfProtection } = require("../middlewares/csrfProtection");
const companyContext = require("../middlewares/companyContext");
const subscriptionContext = require("../middlewares/subscriptionContext");
const createRateLimiter = require("../middleware/rateLimiterGeneral");

const router = express.Router();
const billingLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

router.get("/:companySlug/public", getPublicCompany);
router.post("/:companySlug/auth/login", loginRateLimit, loginWithCompanySlug);
router.use(
  "/:companySlug/billing",
  auth,
  csrfProtection,
  companyContext,
  subscriptionContext,
  billingLimiter,
  billingRoutes,
);
router.get("/:companySlug/billing/_ping", (req, res) => {
  res.json({ ok: true, slug: req.params.companySlug });
});

module.exports = router;
