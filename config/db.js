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

  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM slot_timings");
  if (!rows[0].total) {
    await pool.query(
      `INSERT INTO slot_timings (slot_number, start_time, end_time) VALUES
       (1, '09:00:00', '10:00:00'),
       (2, '10:00:00', '11:00:00'),
       (3, '11:15:00', '12:15:00'),
       (4, '13:00:00', '14:00:00'),
       (5, '14:00:00', '15:00:00'),
       (6, '15:15:00', '16:15:00')`
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
