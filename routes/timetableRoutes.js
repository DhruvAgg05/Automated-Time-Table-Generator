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
router.get("/room-free-grid", requireRole(["admin", "teacher"]), timetableController.getRoomFreeSlots);
router.get("/support", requireRole(["admin"]), timetableController.getSchedulingSupport);
router.get("/extra-lecture/dashboard", requireRole(["teacher"]), timetableController.getTeacherExtraLectureDashboard);
router.get("/extra-lecture/requests", requireRole(["admin", "teacher"]), timetableController.getExtraLectureRequests);
router.post("/extra-lecture/requests", requireRole(["teacher"]), timetableController.createExtraLectureRequest);
router.put("/extra-lecture/requests/:id/approve", requireRole(["admin"]), timetableController.approveExtraLectureRequest);
router.put("/extra-lecture/requests/:id/reject", requireRole(["admin"]), timetableController.rejectExtraLectureRequest);
router.put("/extra-lecture/requests/:id/cancel", requireRole(["admin", "teacher"]), timetableController.cancelExtraLectureRequest);
router.put("/extra-lecture/requests/:id/seen", requireRole(["teacher"]), timetableController.markExtraLectureNotificationSeen);
router.post("/generate", requireRole(["admin"]), timetableController.generateTimetable);
router.put("/:id", requireRole(["admin"]), timetableController.updateTimetableEntry);
router.delete("/:id", requireRole(["admin"]), timetableController.deleteTimetableEntry);
router.delete("/", requireRole(["admin"]), timetableController.clearTimetable);
router.get("/section/:sectionId", requireRole(["admin", "student"]), timetableController.getSectionGrid);
router.get("/reports/summary", requireRole(["admin"]), timetableController.generateSummaryReport);

module.exports = router;
