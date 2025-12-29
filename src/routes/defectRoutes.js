const express = require("express");
const defectController = require("../controllers/defectController");
const requireRole = require("../middlewares/requireRole");
const defectWorkflowController = require("../controllers/defectWorkflowController");

const router = express.Router();

router.post("/", defectController.createDefect);
router.get("/", defectController.listDefects);
router.get("/:id", defectController.getDefect);
router.patch("/:id/status", requireRole("PLATFORM_ADMIN", "ADMIN"), defectController.updateStatus);
router.patch("/:id/assign", requireRole("PLATFORM_ADMIN", "ADMIN"), defectWorkflowController.assign);
router.post("/:id/comments", defectWorkflowController.addComment);
router.get("/:id/comments", defectWorkflowController.listComments);
router.get("/:id/history", defectWorkflowController.listHistory);

module.exports = router;
