const express = require("express");
const { createUser, listUsers, updateUserActive, updateUserPassword, updateUserPhone } = require("../controllers/userController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id/active", updateUserActive);
router.patch("/:id/password", updateUserPassword);
router.patch("/:id/phone", updateUserPhone);

module.exports = router;
