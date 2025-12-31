const express = require("express");
const requireRole = require("../middlewares/requireRole");
const { listRoutes, createRoute, updateRoute } = require("../controllers/routeController");

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));

router.get("/", listRoutes);
router.post("/", createRoute);
router.patch("/:id", updateRoute);

module.exports = router;
