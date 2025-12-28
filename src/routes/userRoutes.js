const express = require("express");
const { createUser, listUsers, updateUserActive, updateUserPassword } = require("../controllers/userController");
const requireRole = require("../middlewares/requireRole");

const router = express.Router();

router.use(requireRole("OWNER", "ADMIN"));
router.get("/", listUsers);
router.post("/", createUser);
router.patch("/:id/active", updateUserActive);
router.patch("/:id/password", updateUserPassword);

module.exports = router;
