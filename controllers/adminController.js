const bcrypt = require("bcryptjs");
const adminModel = require("../models/adminModel");
const teacherModel = require("../models/teacherModel");
const studentModel = require("../models/studentModel");

async function login(req, res, next) {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: "Username, password, and role are required." });
    }

    if (role === "admin") {
      const admin = await adminModel.getAdminByUsername(username);

      if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
        return res.status(401).json({ success: false, message: "Invalid admin credentials." });
      }

      req.session.user = {
        id: admin.id,
        username: admin.username,
        role: "admin",
        name: admin.full_name
      };

      return res.json({ success: true, message: "Admin login successful.", user: req.session.user });
    }

    const user = await adminModel.getUserByUsername(username);

    if (!user || user.role !== role || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Invalid user credentials." });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      teacher_id: user.teacher_id,
      student_id: user.student_id,
      name: user.teacher_name || user.student_name || user.username
    };

    return res.json({ success: true, message: "Login successful.", user: req.session.user });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully." });
  });
}

function getCurrentUser(req, res) {
  res.json({ success: true, user: req.session.user || null });
}

async function getProfile(req, res, next) {
  try {
    const profile = await adminModel.getProfileForSessionUser(req.session.user);
    const managedUsers = req.session.user.role === "admin"
      ? await adminModel.getManagedUserProfiles()
      : undefined;
    res.json({ success: true, data: profile, managedUsers });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    await adminModel.updateOwnProfile(req.session.user, req.body);
    const updatedProfile = await adminModel.getProfileForSessionUser(req.session.user);
    if (updatedProfile?.full_name) {
      req.session.user.name = updatedProfile.full_name;
    }
    res.json({ success: true, message: "Profile updated successfully.", data: updatedProfile });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const { old_password, new_password, confirm_password } = req.body;
    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({ success: false, message: "Old password, new password, and confirmation are required." });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: "New password and confirmation do not match." });
    }

    const currentRecord = req.session.user.role === "admin"
      ? await adminModel.getAdminById(req.session.user.id)
      : await adminModel.getUserByUsername(req.session.user.username);

    if (!currentRecord || !(await bcrypt.compare(old_password, currentRecord.password_hash))) {
      return res.status(400).json({ success: false, message: "Old password is incorrect." });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await adminModel.updatePasswordForSessionUser(req.session.user, passwordHash);
    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
}

async function resetManagedUserPassword(req, res, next) {
  try {
    const { user_id, new_password } = req.body;
    if (!user_id || !new_password) {
      return res.status(400).json({ success: false, message: "User and new password are required." });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await adminModel.resetUserPassword(Number(user_id), passwordHash);
    res.json({ success: true, message: "User password reset successfully." });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const data = await adminModel.getDashboardStats();
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

async function getTeacherWorkload(req, res, next) {
  try {
    const workload = await adminModel.getTeacherWorkload();
    await adminModel.saveReport("Teacher Workload Report", "Teacher Workload", req.session.user.id, workload);
    res.json({ success: true, data: workload });
  } catch (error) {
    next(error);
  }
}

async function getRoomAllocation(req, res, next) {
  try {
    const allocations = await adminModel.getRoomAllocationReport();
    await adminModel.saveReport("Room Allocation Report", "Room Allocation", req.session.user.id, allocations);
    res.json({ success: true, data: allocations });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const reports = await adminModel.getReports();
    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
}

async function getAdminOverview(req, res, next) {
  try {
    const teachers = await teacherModel.getAllTeachers();
    const students = await studentModel.getAllStudents();
    res.json({
      success: true,
      data: {
        teachers: teachers.length,
        students: students.length
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  getCurrentUser,
  getProfile,
  updateProfile,
  changePassword,
  resetManagedUserPassword,
  getDashboard,
  getTeacherWorkload,
  getRoomAllocation,
  getReports,
  getAdminOverview
};
