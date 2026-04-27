const express = require("express");
const teacherController = require("../controllers/teacherController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin"]), teacherController.getAllTeachers);
router.post("/", requireRole(["admin"]), teacherController.createTeacher);
router.put("/:id", requireRole(["admin"]), teacherController.updateTeacher);
router.delete("/:id", requireRole(["admin"]), teacherController.deleteTeacher);
router.get("/:id/availability", requireRole(["admin"]), teacherController.getAvailability);
router.post("/:id/availability", requireRole(["admin"]), teacherController.saveAvailability);
router.get("/portal/me", requireRole(["teacher"]), teacherController.getTeacherPortal);
router.get("/portal/me/availability", requireRole(["teacher"]), teacherController.getAvailability);

module.exports = router;
