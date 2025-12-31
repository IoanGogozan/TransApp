const express = require("express");
const { registerCompany, getPublicCompany } = require("../controllers/publicController");
const registerRateLimit = require("../middleware/registerRateLimit");

const router = express.Router();

router.post("/register", registerRateLimit, registerCompany);
router.get("/c/:companySlug/public", getPublicCompany);

module.exports = router;
