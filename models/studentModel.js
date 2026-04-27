const pool = require("../config/db");

async function getAllStudents() {
  const [rows] = await pool.query(
    `SELECT s.*, d.name AS department_name, c.class_name, sec.section_name
     FROM students s
     JOIN departments d ON s.department_id = d.id
     JOIN classes c ON s.class_id = c.id
     JOIN sections sec ON s.section_id = sec.id
     ORDER BY s.full_name`
  );

  return rows;
}

async function getStudentById(id) {
  const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [id]);
  return rows[0];
}

async function createStudent(data) {
  const [result] = await pool.query(
    `INSERT INTO students
      (roll_number, full_name, email, phone, department_id, class_id, section_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.roll_number,
      data.full_name,
      data.email,
      data.phone || null,
      data.department_id,
      data.class_id,
      data.section_id
    ]
  );

  return result.insertId;
}

async function updateStudent(id, data) {
  await pool.query(
    `UPDATE students
     SET roll_number = ?, full_name = ?, email = ?, phone = ?, department_id = ?, class_id = ?, section_id = ?
     WHERE id = ?`,
    [
      data.roll_number,
      data.full_name,
      data.email,
      data.phone || null,
      data.department_id,
      data.class_id,
      data.section_id,
      id
    ]
  );
}

async function deleteStudent(id) {
  await pool.query("DELETE FROM students WHERE id = ?", [id]);
}

async function getStudentSchedule(studentId) {
  const [studentRows] = await pool.query("SELECT class_id, section_id FROM students WHERE id = ?", [studentId]);
  const student = studentRows[0];

  if (!student) {
    return [];
  }

  const [rows] = await pool.query(
    `SELECT tt.id, tt.day_of_week, tt.slot_number, tt.start_time, tt.end_time,
            s.subject_name, s.subject_code,
            t.full_name AS teacher_name,
            cr.room_name
     FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     JOIN teachers t ON tt.teacher_id = t.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     WHERE tt.class_id = ? AND tt.section_id = ?
     ORDER BY FIELD(tt.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), tt.slot_number`,
    [student.class_id, student.section_id]
  );

  return rows;
}

async function bulkCreateStudents(students) {
  const results = {
    inserted: 0,
    skipped: 0,
    errors: []
  };

  for (const student of students) {
    try {
      await createStudent(student);
      results.inserted += 1;
    } catch (error) {
      if (String(error.message).toLowerCase().includes("duplicate")) {
        results.skipped += 1;
      } else {
        results.errors.push(`${student.roll_number || student.email}: ${error.message}`);
      }
    }
  }

  return results;
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentSchedule,
  bulkCreateStudents
};
