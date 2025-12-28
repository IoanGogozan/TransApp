const express = require("express");
const env = require("../config/env");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    env: env.nodeEnv,
    uptime: process.uptime(),
  });
});

module.exports = router;
