const express = require("express");
const multer = require("multer");
const requireRole = require("../middlewares/requireRole");
const { uploadDocument, deleteDocument } = require("../controllers/documentController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.post("/", upload.single("file"), uploadDocument);
router.delete("/:id", deleteDocument);

module.exports = router;
