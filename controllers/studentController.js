const studentModel = require("../models/studentModel");
const { parseSheet } = require("../middleware/excelHelper");

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

async function uploadStudents(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a .xlsx or .csv file." });
    }

    const rows = parseSheet(req.file.buffer, req.file.originalname);
    const students = rows.map((row) => ({
      roll_number: row.roll_number,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      department_id: Number(row.department_id),
      class_id: Number(row.class_id),
      section_id: Number(row.section_id)
    })).filter((row) => row.roll_number && row.full_name && row.email && row.department_id && row.class_id && row.section_id);

    const result = await studentModel.bulkCreateStudents(students);
    res.json({
      success: true,
      message: `Student upload completed. Added: ${result.inserted}, Skipped duplicates: ${result.skipped}, Errors: ${result.errors.length}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

function downloadStudentTemplate(req, res) {
  const csv = "roll_number,full_name,email,phone,department_id,class_id,section_id\nCSE3A100,Sample Student,sample.student@example.com,9991001999,1,1,1";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=students-template.csv");
  res.send(csv);
}

module.exports = {
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentPortal,
  uploadStudents,
  downloadStudentTemplate
};
