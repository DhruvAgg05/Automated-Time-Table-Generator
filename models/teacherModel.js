const pool = require("../config/db");

async function getAllTeachers() {
  const [rows] = await pool.query(
    `SELECT t.*, d.name AS department_name
     FROM teachers t
     JOIN departments d ON t.department_id = d.id
     ORDER BY t.full_name`
  );

  return rows;
}

async function getTeacherById(id) {
  const [rows] = await pool.query("SELECT * FROM teachers WHERE id = ?", [id]);
  return rows[0];
}

async function createTeacher(data) {
  const [result] = await pool.query(
    `INSERT INTO teachers
      (teacher_code, full_name, email, phone, department_id, designation, max_lectures_per_day)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.teacher_code,
      data.full_name,
      data.email,
      data.phone || null,
      data.department_id,
      data.designation,
      data.max_lectures_per_day || 5
    ]
  );

  return result.insertId;
}

async function updateTeacher(id, data) {
  await pool.query(
    `UPDATE teachers
     SET teacher_code = ?, full_name = ?, email = ?, phone = ?, department_id = ?, designation = ?, max_lectures_per_day = ?
     WHERE id = ?`,
    [
      data.teacher_code,
      data.full_name,
      data.email,
      data.phone || null,
      data.department_id,
      data.designation,
      data.max_lectures_per_day || 5,
      id
    ]
  );
}

async function deleteTeacher(id) {
  await pool.query("DELETE FROM teachers WHERE id = ?", [id]);
}

async function getTeacherAvailability(teacherId) {
  const [rows] = await pool.query(
    `SELECT id, teacher_id, day_of_week, slot_number, is_available
     FROM teacher_availability
     WHERE teacher_id = ?
     ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), slot_number`,
    [teacherId]
  );

  return rows;
}

async function replaceTeacherAvailability(teacherId, slots) {
  await pool.query("DELETE FROM teacher_availability WHERE teacher_id = ?", [teacherId]);

  if (!slots.length) {
    return;
  }

  const values = slots.map((slot) => [teacherId, slot.day_of_week, slot.slot_number, slot.is_available ? 1 : 0]);
  await pool.query(
    "INSERT INTO teacher_availability (teacher_id, day_of_week, slot_number, is_available) VALUES ?",
    [values]
  );
}

async function getTeacherSchedule(teacherId) {
  const [rows] = await pool.query(
    `SELECT tt.id, tt.day_of_week, tt.slot_number, tt.start_time, tt.end_time,
            s.subject_name, s.subject_type,
            c.class_name, sec.section_name,
            cr.room_name
     FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     JOIN classes c ON tt.class_id = c.id
     JOIN sections sec ON tt.section_id = sec.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     WHERE tt.teacher_id = ?
     ORDER BY FIELD(tt.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), tt.slot_number`,
    [teacherId]
  );

  return rows;
}

async function getTeacherAssignedSubjects(teacherId) {
  const [rows] = await pool.query(
    `SELECT ts.id,
            s.subject_name,
            s.subject_code,
            s.subject_type,
            c.class_name,
            sec.section_name
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     JOIN classes c ON ts.class_id = c.id
     JOIN sections sec ON ts.section_id = sec.id
     WHERE ts.teacher_id = ?
     ORDER BY s.subject_name`,
    [teacherId]
  );

  return rows;
}

async function bulkCreateTeachers(teachers) {
  const results = {
    inserted: 0,
    skipped: 0,
    errors: []
  };

  for (const teacher of teachers) {
    try {
      await createTeacher(teacher);
      results.inserted += 1;
    } catch (error) {
      if (String(error.message).toLowerCase().includes("duplicate")) {
        results.skipped += 1;
      } else {
        results.errors.push(`${teacher.teacher_code || teacher.email}: ${error.message}`);
      }
    }
  }

  return results;
}

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherAvailability,
  replaceTeacherAvailability,
  getTeacherSchedule,
  getTeacherAssignedSubjects,
  bulkCreateTeachers
};
