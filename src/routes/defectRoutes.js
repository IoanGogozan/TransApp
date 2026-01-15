const express = require("express");
const multer = require("multer");
const defectController = require("../controllers/defectController");
const requireRole = require("../middlewares/requireRole");
const defectWorkflowController = require("../controllers/defectWorkflowController");
const defectAttachmentController = require("../controllers/defectAttachmentController");

const router = express.Router();
const allowedAttachmentMimeTypes = new Set(["image/jpeg", "image/png"]);
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedAttachmentMimeTypes.has(file.mimetype)) {
      const err = new Error("UPLOAD_FILE_TYPE_NOT_ALLOWED");
      err.code = "UPLOAD_FILE_TYPE_NOT_ALLOWED";
      return cb(err);
    }
    return cb(null, true);
  },
});

router.post("/", defectController.createDefect);
router.get("/", defectController.listDefects);
router.get("/:id", defectController.getDefect);
router.patch("/:id", defectController.updateDefectDetails);
router.patch("/:id/status", requireRole("PLATFORM_ADMIN", "ADMIN"), defectController.updateStatus);
router.patch("/:id/assign", requireRole("PLATFORM_ADMIN", "ADMIN"), defectWorkflowController.assign);
router.post("/:id/comments", defectWorkflowController.addComment);
router.get("/:id/comments", defectWorkflowController.listComments);
router.get("/:id/history", defectWorkflowController.listHistory);
router.get("/:id/attachments", defectAttachmentController.listDefectAttachments);
router.get("/:id/attachments/:attachmentId/download", defectAttachmentController.downloadDefectAttachment);
router.post("/:id/attachments", (req, res, next) => {
  attachmentUpload.single("file")(req, res, (err) => {
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
    return defectAttachmentController.uploadDefectAttachment(req, res, next);
  });
});
router.delete("/:id/attachments/:attachmentId", defectAttachmentController.deleteDefectAttachment);

module.exports = router;
