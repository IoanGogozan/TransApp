const express = require("express");
const checklistController = require("../controllers/checklistController");

const router = express.Router();

router.get("/questions", checklistController.getQuestions);
router.get("/status", checklistController.getStatus);
router.post("/submit", checklistController.submitChecklist);
router.get("/", checklistController.listChecklists);
router.get("/:id", checklistController.getChecklist);

module.exports = router;
