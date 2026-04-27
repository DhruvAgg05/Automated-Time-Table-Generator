const express = require("express");
const classroomController = require("../controllers/classroomController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin"]), classroomController.getAllClassrooms);
router.post("/", requireRole(["admin"]), classroomController.createClassroom);
router.put("/:id", requireRole(["admin"]), classroomController.updateClassroom);
router.delete("/:id", requireRole(["admin"]), classroomController.deleteClassroom);
router.get("/usage/report", requireRole(["admin"]), classroomController.getRoomUsage);

module.exports = router;
