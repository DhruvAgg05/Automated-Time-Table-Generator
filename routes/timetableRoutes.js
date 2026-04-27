const express = require("express");
const timetableController = require("../controllers/timetableController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin", "teacher", "student"]), timetableController.getAllTimetable);
router.post("/generate", requireRole(["admin"]), timetableController.generateTimetable);
router.put("/:id", requireRole(["admin"]), timetableController.updateTimetableEntry);
router.delete("/:id", requireRole(["admin"]), timetableController.deleteTimetableEntry);
router.delete("/", requireRole(["admin"]), timetableController.clearTimetable);
router.get("/section/:sectionId", requireRole(["admin", "student"]), timetableController.getSectionGrid);
router.get("/reports/summary", requireRole(["admin"]), timetableController.generateSummaryReport);

module.exports = router;
