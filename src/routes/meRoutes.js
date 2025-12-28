const express = require("express");
const { getMe } = require("../controllers/meController");

const router = express.Router();

router.get("/", getMe);

module.exports = router;
