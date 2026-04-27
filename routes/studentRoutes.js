const express = require("express");
const studentController = require("../controllers/studentController");
const { requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", requireRole(["admin"]), studentController.getAllStudents);
router.get("/template/download", requireRole(["admin"]), studentController.downloadStudentTemplate);
router.post("/upload", requireRole(["admin"]), upload.single("file"), studentController.uploadStudents);
router.post("/", requireRole(["admin"]), studentController.createStudent);
router.put("/:id", requireRole(["admin"]), studentController.updateStudent);
router.delete("/:id", requireRole(["admin"]), studentController.deleteStudent);
router.get("/portal/me", requireRole(["student"]), studentController.getStudentPortal);

module.exports = router;
