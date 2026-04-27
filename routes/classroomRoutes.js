const express = require("express");
const classroomController = require("../controllers/classroomController");
const { requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin"]), classroomController.getAllClassrooms);
router.get("/template/download", requireRole(["admin"]), classroomController.downloadClassroomTemplate);
router.post("/upload", requireRole(["admin"]), upload.single("file"), classroomController.uploadClassrooms);
router.post("/", requireRole(["admin"]), classroomController.createClassroom);
router.put("/:id", requireRole(["admin"]), classroomController.updateClassroom);
router.delete("/:id", requireRole(["admin"]), classroomController.deleteClassroom);
router.get("/usage/report", requireRole(["admin"]), classroomController.getRoomUsage);

module.exports = router;
