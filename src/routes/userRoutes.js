const express = require("express");
const { createUser, listUsers, updateUserActive, updateUserPassword, updateUserPhone } = require("../controllers/userController");
const requireRole = require("../middlewares/requireRole");
const requireActiveSubscription = require("../middlewares/requireActiveSubscription");

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.get("/", listUsers);
router.post("/", requireActiveSubscription, createUser);
router.patch("/:id/active", requireActiveSubscription, updateUserActive);
router.patch("/:id/password", requireActiveSubscription, updateUserPassword);
router.patch("/:id/phone", requireActiveSubscription, updateUserPhone);

module.exports = router;
