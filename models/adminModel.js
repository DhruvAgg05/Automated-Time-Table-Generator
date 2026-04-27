const pool = require("../config/db");

async function getAdminByUsername(username) {
  const [rows] = await pool.query("SELECT * FROM admins WHERE username = ?", [username]);
  return rows[0];
}

async function getUserByUsername(username) {
  const [rows] = await pool.query(
    `SELECT u.*,
            t.full_name AS teacher_name,
            s.full_name AS student_name
     FROM users u
     LEFT JOIN teachers t ON u.teacher_id = t.id
     LEFT JOIN students s ON u.student_id = s.id
     WHERE u.username = ? AND u.is_active = 1`,
    [username]
  );

  return rows[0];
}

async function getDashboardStats() {
  const [[teachers]] = await pool.query("SELECT COUNT(*) AS total FROM teachers");
  const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM students");
  const [[subjects]] = await pool.query("SELECT COUNT(*) AS total FROM subjects");
  const [[rooms]] = await pool.query("SELECT COUNT(*) AS total FROM classrooms");
  const [[classes]] = await pool.query("SELECT COUNT(*) AS total FROM classes");
  const [[entries]] = await pool.query("SELECT COUNT(*) AS total FROM timetable");

  const [recentTimetable] = await pool.query(
    `SELECT tt.id, tt.day_of_week, tt.slot_number, s.subject_name, t.full_name AS teacher_name,
            c.class_name, sec.section_name, cr.room_name
     FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     JOIN teachers t ON tt.teacher_id = t.id
     JOIN classes c ON tt.class_id = c.id
     JOIN sections sec ON tt.section_id = sec.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     ORDER BY tt.created_at DESC
     LIMIT 8`
  );

  return {
    stats: {
      teachers: teachers.total,
      students: students.total,
      subjects: subjects.total,
      rooms: rooms.total,
      classes: classes.total,
      timetableEntries: entries.total
    },
    recentTimetable
  };
}

async function getTeacherWorkload() {
  const [rows] = await pool.query(
    `SELECT t.id,
            t.teacher_code,
            t.full_name,
            t.designation,
            COUNT(tt.id) AS assigned_periods,
            COUNT(DISTINCT tt.section_id) AS assigned_sections
     FROM teachers t
     LEFT JOIN timetable tt ON tt.teacher_id = t.id
     GROUP BY t.id, t.teacher_code, t.full_name, t.designation
     ORDER BY assigned_periods DESC, t.full_name`
  );

  return rows;
}

async function getRoomAllocationReport() {
  const [rows] = await pool.query(
    `SELECT c.room_name,
            c.room_type,
            c.capacity,
            COUNT(tt.id) AS booked_slots
     FROM classrooms c
     LEFT JOIN timetable tt ON tt.classroom_id = c.id
     GROUP BY c.id, c.room_name, c.room_type, c.capacity
     ORDER BY booked_slots DESC, c.room_name`
  );

  return rows;
}

async function saveReport(reportName, reportType, generatedBy, reportData) {
  const [result] = await pool.query(
    "INSERT INTO reports (report_name, report_type, generated_by, report_data) VALUES (?, ?, ?, ?)",
    [reportName, reportType, generatedBy || null, JSON.stringify(reportData)]
  );

  return result.insertId;
}

async function getReports() {
  const [rows] = await pool.query(
    `SELECT r.id, r.report_name, r.report_type, r.generated_on, a.full_name AS generated_by
     FROM reports r
     LEFT JOIN admins a ON r.generated_by = a.id
     ORDER BY r.generated_on DESC`
  );

  return rows;
}

module.exports = {
  getAdminByUsername,
  getUserByUsername,
  getDashboardStats,
  getTeacherWorkload,
  getRoomAllocationReport,
  saveReport,
  getReports
};
