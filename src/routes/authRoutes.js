const express = require("express");
const { register, login } = require("../controllers/authController");
const loginRateLimit = require("../middleware/loginRateLimit");
const { forgotPassword, validateResetToken, resetPassword } = require("../controllers/passwordResetController");
const forgotPasswordRateLimit = require("../middleware/forgotPasswordRateLimit");
const createRateLimiter = require("../middleware/rateLimiterGeneral");

const router = express.Router();
const resetLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

router.post("/register", register);
router.post("/login", loginRateLimit, login);
router.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
router.get("/reset-password/validate", resetLimiter, validateResetToken);
router.post("/reset-password", resetLimiter, resetPassword);

module.exports = router;
