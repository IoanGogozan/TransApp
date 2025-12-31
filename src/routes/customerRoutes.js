const express = require("express");
const requireRole = require("../middlewares/requireRole");
const { listCustomers, createCustomer, updateCustomer } = require("../controllers/customerController");

const router = express.Router();

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));

router.get("/", listCustomers);
router.post("/", createCustomer);
router.patch("/:id", updateCustomer);

module.exports = router;
