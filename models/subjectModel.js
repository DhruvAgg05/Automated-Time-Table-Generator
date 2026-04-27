const pool = require("../config/db");

async function getAllSubjects() {
  const [rows] = await pool.query(
    `SELECT s.*, d.name AS department_name
     FROM subjects s
     JOIN departments d ON s.department_id = d.id
     ORDER BY s.subject_name`
  );

  return rows;
}

async function getSubjectById(id) {
  const [rows] = await pool.query("SELECT * FROM subjects WHERE id = ?", [id]);
  return rows[0];
}

async function createSubject(data) {
  const [result] = await pool.query(
    `INSERT INTO subjects
      (subject_code, subject_name, department_id, semester, subject_type, credits, lectures_per_week)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.subject_code,
      data.subject_name,
      data.department_id,
      data.semester,
      data.subject_type,
      data.credits,
      data.lectures_per_week
    ]
  );

  return result.insertId;
}

async function updateSubject(id, data) {
  await pool.query(
    `UPDATE subjects
     SET subject_code = ?, subject_name = ?, department_id = ?, semester = ?, subject_type = ?, credits = ?, lectures_per_week = ?
     WHERE id = ?`,
    [
      data.subject_code,
      data.subject_name,
      data.department_id,
      data.semester,
      data.subject_type,
      data.credits,
      data.lectures_per_week,
      id
    ]
  );
}

async function deleteSubject(id) {
  await pool.query("DELETE FROM subjects WHERE id = ?", [id]);
}

async function getDepartments() {
  const [rows] = await pool.query("SELECT * FROM departments ORDER BY name");
  return rows;
}

async function createDepartment(data) {
  const [result] = await pool.query("INSERT INTO departments (name, code) VALUES (?, ?)", [data.name, data.code]);
  return result.insertId;
}

async function updateDepartment(id, data) {
  await pool.query("UPDATE departments SET name = ?, code = ? WHERE id = ?", [data.name, data.code, id]);
}

async function deleteDepartment(id) {
  await pool.query("DELETE FROM departments WHERE id = ?", [id]);
}

async function getClasses() {
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS department_name
     FROM classes c
     JOIN departments d ON c.department_id = d.id
     ORDER BY c.academic_year DESC, c.class_name`
  );

  return rows;
}

async function createClass(data) {
  const [result] = await pool.query(
    "INSERT INTO classes (department_id, class_name, semester, academic_year) VALUES (?, ?, ?, ?)",
    [data.department_id, data.class_name, data.semester, data.academic_year]
  );

  return result.insertId;
}

async function updateClass(id, data) {
  await pool.query(
    "UPDATE classes SET department_id = ?, class_name = ?, semester = ?, academic_year = ? WHERE id = ?",
    [data.department_id, data.class_name, data.semester, data.academic_year, id]
  );
}

async function deleteClass(id) {
  await pool.query("DELETE FROM classes WHERE id = ?", [id]);
}

async function getSections() {
  const [rows] = await pool.query(
    `SELECT s.*, c.class_name
     FROM sections s
     JOIN classes c ON s.class_id = c.id
     ORDER BY c.class_name, s.section_name`
  );

  return rows;
}

async function createSection(data) {
  const [result] = await pool.query(
    "INSERT INTO sections (class_id, section_name, strength) VALUES (?, ?, ?)",
    [data.class_id, data.section_name, data.strength]
  );

  return result.insertId;
}

async function updateSection(id, data) {
  await pool.query(
    "UPDATE sections SET class_id = ?, section_name = ?, strength = ? WHERE id = ?",
    [data.class_id, data.section_name, data.strength, id]
  );
}

async function deleteSection(id) {
  await pool.query("DELETE FROM sections WHERE id = ?", [id]);
}

async function getClassSubjectAssignments() {
  const [rows] = await pool.query(
    `SELECT cs.id, cs.class_id, cs.section_id, cs.subject_id, cs.required_lectures,
            c.class_name, sec.section_name, s.subject_name, s.subject_code
     FROM class_subjects cs
     JOIN classes c ON cs.class_id = c.id
     JOIN sections sec ON cs.section_id = sec.id
     JOIN subjects s ON cs.subject_id = s.id
     ORDER BY c.class_name, sec.section_name, s.subject_name`
  );

  return rows;
}

async function saveClassSubjectAssignment(data) {
  const [result] = await pool.query(
    `INSERT INTO class_subjects (class_id, section_id, subject_id, required_lectures)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE required_lectures = VALUES(required_lectures), class_id = VALUES(class_id)`,
    [data.class_id, data.section_id, data.subject_id, data.required_lectures]
  );

  return result.insertId;
}

async function getTeacherSubjectAssignments() {
  const [rows] = await pool.query(
    `SELECT ts.id, ts.teacher_id, ts.subject_id, ts.class_id, ts.section_id,
            t.full_name AS teacher_name, s.subject_name, s.subject_code, c.class_name, sec.section_name
     FROM teacher_subjects ts
     JOIN teachers t ON ts.teacher_id = t.id
     JOIN subjects s ON ts.subject_id = s.id
     JOIN classes c ON ts.class_id = c.id
     JOIN sections sec ON ts.section_id = sec.id
     ORDER BY t.full_name, s.subject_name`
  );

  return rows;
}

async function saveTeacherSubjectAssignment(data) {
  const [result] = await pool.query(
    `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id, section_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), section_id = VALUES(section_id)`,
    [data.teacher_id, data.subject_id, data.class_id, data.section_id]
  );

  return result.insertId;
}

module.exports = {
  getAllSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  getClassSubjectAssignments,
  saveClassSubjectAssignment,
  getTeacherSubjectAssignments,
  saveTeacherSubjectAssignment
};
