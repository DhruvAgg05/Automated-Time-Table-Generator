const express = require("express");
const adminController = require("../controllers/adminController");
const { requireApiAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", adminController.login);
router.post("/logout", requireApiAuth, adminController.logout);
router.get("/me", adminController.getCurrentUser);
router.get("/profile", requireApiAuth, adminController.getProfile);
router.put("/profile", requireApiAuth, adminController.updateProfile);
router.put("/profile/password", requireApiAuth, adminController.changePassword);
router.put("/managed-users/password", requireRole(["admin"]), adminController.resetManagedUserPassword);
router.get("/dashboard", requireRole(["admin"]), adminController.getDashboard);
router.get("/overview", requireRole(["admin"]), adminController.getAdminOverview);
router.get("/teacher-workload", requireRole(["admin"]), adminController.getTeacherWorkload);
router.get("/room-allocation", requireRole(["admin"]), adminController.getRoomAllocation);
router.get("/reports", requireRole(["admin"]), adminController.getReports);

module.exports = router;
