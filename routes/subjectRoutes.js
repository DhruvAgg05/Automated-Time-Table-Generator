const express = require("express");
const subjectController = require("../controllers/subjectController");
const { requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/reference-data", requireRole(["admin"]), subjectController.getReferenceData);

router.get("/", requireApiAccess, subjectController.getAllSubjects);
router.post("/", requireRole(["admin"]), subjectController.createSubject);
router.put("/:id", requireRole(["admin"]), subjectController.updateSubject);
router.delete("/:id", requireRole(["admin"]), subjectController.deleteSubject);

router.get("/departments/all", requireApiAccess, subjectController.getDepartments);
router.post("/departments", requireRole(["admin"]), subjectController.createDepartment);
router.put("/departments/:id", requireRole(["admin"]), subjectController.updateDepartment);
router.delete("/departments/:id", requireRole(["admin"]), subjectController.deleteDepartment);

router.get("/classes/all", requireApiAccess, subjectController.getClasses);
router.post("/classes", requireRole(["admin"]), subjectController.createClass);
router.put("/classes/:id", requireRole(["admin"]), subjectController.updateClass);
router.delete("/classes/:id", requireRole(["admin"]), subjectController.deleteClass);

router.get("/sections/all", requireApiAccess, subjectController.getSections);
router.post("/sections", requireRole(["admin"]), subjectController.createSection);
router.put("/sections/:id", requireRole(["admin"]), subjectController.updateSection);
router.delete("/sections/:id", requireRole(["admin"]), subjectController.deleteSection);

router.post("/class-assignments", requireRole(["admin"]), subjectController.saveClassSubjectAssignment);
router.post("/teacher-assignments", requireRole(["admin"]), subjectController.saveTeacherSubjectAssignment);

function requireApiAccess(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  next();
}

module.exports = router;
