const studentModel = require("../models/studentModel");

async function getAllStudents(req, res, next) {
  try {
    const students = await studentModel.getAllStudents();
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
}

async function createStudent(req, res, next) {
  try {
    const id = await studentModel.createStudent(req.body);
    res.status(201).json({ success: true, message: "Student added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateStudent(req, res, next) {
  try {
    await studentModel.updateStudent(req.params.id, req.body);
    res.json({ success: true, message: "Student updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteStudent(req, res, next) {
  try {
    await studentModel.deleteStudent(req.params.id);
    res.json({ success: true, message: "Student deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getStudentPortal(req, res, next) {
  try {
    const studentId = req.session.user.student_id;
    const schedule = await studentModel.getStudentSchedule(studentId);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentPortal
};
