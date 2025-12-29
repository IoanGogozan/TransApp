const express = require("express");
const { getMe, updateMyPassword } = require("../controllers/meController");

const router = express.Router();

router.get("/", getMe);
router.patch("/password", updateMyPassword);

module.exports = router;
