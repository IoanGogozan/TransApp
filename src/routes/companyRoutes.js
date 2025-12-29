const express = require("express");
const { loginWithCompanySlug } = require("../controllers/authController");
const { getPublicCompany } = require("../controllers/companyController");
const loginRateLimit = require("../middleware/loginRateLimit");

const router = express.Router();

router.get("/:companySlug/public", getPublicCompany);
router.post("/:companySlug/auth/login", loginRateLimit, loginWithCompanySlug);

module.exports = router;
