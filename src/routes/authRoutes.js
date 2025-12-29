const express = require("express");
const { register, login } = require("../controllers/authController");
const loginRateLimit = require("../middleware/loginRateLimit");

const router = express.Router();

router.post("/register", register);
router.post("/login", loginRateLimit, login);

module.exports = router;
