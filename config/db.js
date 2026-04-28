const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root123",
  database: process.env.DB_NAME || "automated_timetable_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
});

pool.initializeDatabase = async () => {
  async function columnExists(tableName, columnName) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [tableName, columnName]
    );

    return rows[0].total > 0;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS timetable_settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      lecture_duration_minutes INT NOT NULL DEFAULT 60,
      lab_duration_minutes INT NOT NULL DEFAULT 120,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS slot_timings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      slot_number INT NOT NULL UNIQUE,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS extra_lecture_requests (
      request_id INT PRIMARY KEY AUTO_INCREMENT,
      teacher_id INT NOT NULL,
      subject_id INT NOT NULL,
      class_id INT NOT NULL,
      section_id INT NOT NULL,
      request_type ENUM('Lecture', 'Lab') NOT NULL DEFAULT 'Lecture',
      room_type_needed ENUM('Classroom', 'Lab') NOT NULL DEFAULT 'Classroom',
      room_id INT NULL,
      requested_day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
      requested_date DATE NOT NULL,
      slot_number INT NOT NULL,
      end_slot_number INT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed', 'Needs Reschedule') NOT NULL DEFAULT 'Pending',
      notes TEXT NULL,
      admin_notes TEXT NULL,
      notification_message TEXT NULL,
      notification_seen TINYINT(1) NOT NULL DEFAULT 0,
      approved_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_extra_requests_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      CONSTRAINT fk_extra_requests_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      CONSTRAINT fk_extra_requests_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      CONSTRAINT fk_extra_requests_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
      CONSTRAINT fk_extra_requests_room FOREIGN KEY (room_id) REFERENCES classrooms(id) ON DELETE SET NULL,
      CONSTRAINT fk_extra_requests_admin FOREIGN KEY (approved_by) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM slot_timings");
  if (!rows[0].total) {
    await pool.query(
      `INSERT INTO slot_timings (slot_number, start_time, end_time) VALUES
       (1, '08:00:00', '09:00:00'),
       (2, '09:00:00', '10:00:00'),
       (3, '10:00:00', '11:00:00'),
       (4, '11:00:00', '12:00:00'),
       (5, '14:00:00', '15:00:00'),
       (6, '15:00:00', '16:00:00'),
       (7, '16:00:00', '17:00:00')`
    );
  }

  const [settingRows] = await pool.query("SELECT COUNT(*) AS total FROM timetable_settings");
  if (!settingRows[0].total) {
    await pool.query(
      "INSERT INTO timetable_settings (lecture_duration_minutes, lab_duration_minutes) VALUES (60, 120)"
    );
  }

  await pool.query(`
    ALTER TABLE subjects
    MODIFY COLUMN subject_type ENUM('Theory Only', 'Lab Only', 'Both Theory + Lab', 'Theory', 'Lab') NOT NULL DEFAULT 'Theory Only'
  `);
  await pool.query("UPDATE subjects SET subject_type = 'Theory Only' WHERE subject_type = 'Theory'");
  await pool.query("UPDATE subjects SET subject_type = 'Lab Only' WHERE subject_type = 'Lab'");
  await pool.query(`
    ALTER TABLE subjects
    MODIFY COLUMN subject_type ENUM('Theory Only', 'Lab Only', 'Both Theory + Lab') NOT NULL DEFAULT 'Theory Only'
  `);

  if (!(await columnExists("subjects", "theory_lectures_per_week"))) {
    await pool.query(
      "ALTER TABLE subjects ADD COLUMN theory_lectures_per_week INT NOT NULL DEFAULT 0"
    );
  }

  if (!(await columnExists("subjects", "lab_sessions_per_week"))) {
    await pool.query(
      "ALTER TABLE subjects ADD COLUMN lab_sessions_per_week INT NOT NULL DEFAULT 0"
    );
  }

  if (!(await columnExists("extra_lecture_requests", "class_id"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN class_id INT NOT NULL DEFAULT 1");
  }

  if (!(await columnExists("extra_lecture_requests", "section_id"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN section_id INT NOT NULL DEFAULT 1");
  }

  if (!(await columnExists("extra_lecture_requests", "end_slot_number"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN end_slot_number INT NOT NULL DEFAULT 1");
  }

  if (!(await columnExists("extra_lecture_requests", "admin_notes"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN admin_notes TEXT NULL");
  }

  if (!(await columnExists("extra_lecture_requests", "notification_message"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN notification_message TEXT NULL");
  }

  if (!(await columnExists("extra_lecture_requests", "notification_seen"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN notification_seen TINYINT(1) NOT NULL DEFAULT 0");
  }

  if (!(await columnExists("extra_lecture_requests", "approved_by"))) {
    await pool.query("ALTER TABLE extra_lecture_requests ADD COLUMN approved_by INT NULL");
  }

  await pool.query(`
    UPDATE subjects
    SET theory_lectures_per_week = CASE
      WHEN theory_lectures_per_week = 0 AND subject_type IN ('Theory Only', 'Both Theory + Lab') THEN lectures_per_week
      ELSE theory_lectures_per_week
    END
  `);
  await pool.query(`
    UPDATE subjects
    SET lab_sessions_per_week = CASE
      WHEN lab_sessions_per_week = 0 AND subject_type = 'Lab Only' THEN GREATEST(1, ROUND(lectures_per_week / 2))
      ELSE lab_sessions_per_week
    END
  `);
};

module.exports = pool;
