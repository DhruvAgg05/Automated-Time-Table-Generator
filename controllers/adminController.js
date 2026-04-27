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
  getDashboard,
  getTeacherWorkload,
  getRoomAllocation,
  getReports,
  getAdminOverview
};
