const express = require("express");
const timetableController = require("../controllers/timetableController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin", "teacher", "student"]), timetableController.getAllTimetable);
router.get("/settings", requireRole(["admin"]), timetableController.getTimetableSettings);
router.put("/settings", requireRole(["admin"]), timetableController.updateTimetableSettings);
router.get("/slots", requireRole(["admin"]), timetableController.getSlotTimings);
router.post("/slots", requireRole(["admin"]), timetableController.createSlotTiming);
router.put("/slots/:id", requireRole(["admin"]), timetableController.updateSlotTiming);
router.delete("/slots/:id", requireRole(["admin"]), timetableController.deleteSlotTiming);
router.get("/teacher-grid", requireRole(["admin"]), timetableController.getTeacherGrid);
router.get("/teacher-free-grid", requireRole(["admin"]), timetableController.getTeacherFreeGrid);
router.get("/support", requireRole(["admin"]), timetableController.getSchedulingSupport);
router.post("/generate", requireRole(["admin"]), timetableController.generateTimetable);
router.put("/:id", requireRole(["admin"]), timetableController.updateTimetableEntry);
router.delete("/:id", requireRole(["admin"]), timetableController.deleteTimetableEntry);
router.delete("/", requireRole(["admin"]), timetableController.clearTimetable);
router.get("/section/:sectionId", requireRole(["admin", "student"]), timetableController.getSectionGrid);
router.get("/reports/summary", requireRole(["admin"]), timetableController.generateSummaryReport);

module.exports = router;
