const express = require("express");
const multer = require("multer");
const requireRole = require("../middlewares/requireRole");
const { uploadDocument, deleteDocument } = require("../controllers/documentController");

const router = express.Router();
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const err = new Error("UPLOAD_FILE_TYPE_NOT_ALLOWED");
      err.code = "UPLOAD_FILE_TYPE_NOT_ALLOWED";
      return cb(err);
    }
    return cb(null, true);
  },
});

router.use(requireRole("PLATFORM_ADMIN", "ADMIN"));
router.post("/", upload.single("file"), (err, req, res, next) => {
  if (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: { code: "UPLOAD_FILE_TOO_LARGE", message: "File too large" } });
    }
    if (err.code === "UPLOAD_FILE_TYPE_NOT_ALLOWED") {
      return res.status(400).json({
        error: { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED", message: "File type not allowed" },
      });
    }
    return next(err);
  }
  return uploadDocument(req, res, next);
});
router.delete("/:id", deleteDocument);

module.exports = router;
