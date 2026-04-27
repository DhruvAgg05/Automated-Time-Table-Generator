const pool = require("../config/db");

const PASSWORD_HASH = "$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

function buildAvailabilityRows(teachers) {
  const blockedSlots = {
    T101: ["Monday-1", "Wednesday-7"],
    T102: ["Tuesday-1", "Thursday-7"],
    T103: ["Friday-1", "Saturday-7"],
    T104: ["Wednesday-1", "Friday-7"],
    T105: ["Monday-7", "Thursday-1"],
    T106: ["Tuesday-7", "Saturday-1"],
    T107: ["Monday-5", "Friday-5"],
    T108: ["Tuesday-6", "Thursday-6"],
    T109: ["Wednesday-6", "Saturday-6"],
    T110: ["Monday-2", "Friday-2"]
  };

  const rows = [];
  teachers.forEach((teacher, index) => {
    const teacherId = index + 1;
    const teacherCode = teacher[0];
    const blocked = new Set(blockedSlots[teacherCode] || []);

    DAYS.forEach((day) => {
      SLOT_NUMBERS.forEach((slotNumber) => {
        rows.push([
          teacherId,
          day,
          slotNumber,
          blocked.has(`${day}-${slotNumber}`) ? 0 : 1
        ]);
      });
    });
  });

  return rows;
}

async function resetTables(connection) {
  const tables = [
    "reports",
    "timetable",
    "teacher_availability",
    "teacher_subjects",
    "class_subjects",
    "users",
    "admins",
    "students",
    "subjects",
    "classrooms",
    "sections",
    "classes",
    "teachers",
    "departments",
    "slot_timings",
    "timetable_settings"
  ];

  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of tables) {
    await connection.query(`DELETE FROM ${table}`);
    await connection.query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
  }
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
}

async function seed() {
  const connection = await pool.getConnection();

  const departments = [
    ["Computer Science and Engineering", "CSE"],
    ["Information Technology", "IT"],
    ["Electronics and Communication", "ECE"]
  ];

  const classes = [
    [1, "B.Tech CSE II Year", 3, "2026-2027"],
    [1, "B.Tech CSE III Year", 5, "2026-2027"],
    [2, "B.Tech IT II Year", 3, "2026-2027"]
  ];

  const sections = [
    [1, "A", 48],
    [1, "B", 46],
    [2, "A", 44],
    [3, "A", 42]
  ];

  const teachers = [
    ["T101", "Dr. Meera Sharma", "meera.sharma@example.com", "9876500001", 1, "Professor", 5],
    ["T102", "Prof. Arjun Verma", "arjun.verma@example.com", "9876500002", 1, "Associate Professor", 5],
    ["T103", "Ms. Nisha Rao", "nisha.rao@example.com", "9876500003", 1, "Assistant Professor", 5],
    ["T104", "Dr. Kavita Menon", "kavita.menon@example.com", "9876500004", 1, "Professor", 5],
    ["T105", "Mr. Rahul Joshi", "rahul.joshi@example.com", "9876500005", 1, "Assistant Professor", 5],
    ["T106", "Dr. Sameer Khan", "sameer.khan@example.com", "9876500006", 1, "Professor", 5],
    ["T107", "Prof. Priya Singh", "priya.singh@example.com", "9876500007", 1, "Associate Professor", 5],
    ["T108", "Ms. Anjali Desai", "anjali.desai@example.com", "9876500008", 1, "Assistant Professor", 5],
    ["T109", "Mr. Vikram Patel", "vikram.patel@example.com", "9876500009", 2, "Assistant Professor", 5],
    ["T110", "Ms. Sneha Iyer", "sneha.iyer@example.com", "9876500010", 2, "Assistant Professor", 5]
  ];

  const students = [
    ["CSE3A001", "Aman Gupta", "aman.gupta@example.com", "9991001001", 1, 1, 1],
    ["CSE3A002", "Riya Patel", "riya.patel@example.com", "9991001002", 1, 1, 1],
    ["CSE3A003", "Keshav Nair", "keshav.nair@example.com", "9991001003", 1, 1, 1],
    ["CSE3B001", "Neha Joshi", "neha.joshi@example.com", "9991001004", 1, 1, 2],
    ["CSE3B002", "Tanvi Shah", "tanvi.shah@example.com", "9991001005", 1, 1, 2],
    ["CSE3B003", "Harsh Mehta", "harsh.mehta@example.com", "9991001006", 1, 1, 2],
    ["CSE5A001", "Karan Malhotra", "karan.malhotra@example.com", "9991001007", 1, 2, 3],
    ["CSE5A002", "Ishita Roy", "ishita.roy@example.com", "9991001008", 1, 2, 3],
    ["CSE5A003", "Varun Sethi", "varun.sethi@example.com", "9991001009", 1, 2, 3],
    ["IT3A001", "Simran Kaur", "simran.kaur@example.com", "9991001010", 2, 3, 4],
    ["IT3A002", "Rohan Das", "rohan.das@example.com", "9991001011", 2, 3, 4],
    ["IT3A003", "Pooja Sharma", "pooja.sharma@example.com", "9991001012", 2, 3, 4]
  ];

  const subjects = [
    ["CS301", "Data Structures", 1, 3, "Theory Only", 4, 4, 0, 4],
    ["CS302", "Database Management Systems", 1, 3, "Both Theory + Lab", 4, 3, 1, 4],
    ["CS303", "Object Oriented Programming Lab", 1, 3, "Lab Only", 2, 0, 1, 1],
    ["CS304", "Discrete Mathematics", 1, 3, "Theory Only", 3, 3, 0, 3],
    ["CS305", "Web Programming", 1, 3, "Both Theory + Lab", 3, 2, 1, 3],
    ["CS501", "Operating Systems", 1, 5, "Theory Only", 4, 4, 0, 4],
    ["CS502", "Computer Networks", 1, 5, "Both Theory + Lab", 4, 3, 1, 4],
    ["CS503", "Software Engineering", 1, 5, "Theory Only", 3, 3, 0, 3],
    ["CS504", "Algorithms", 1, 5, "Theory Only", 3, 3, 0, 3],
    ["CS505", "Java Programming Lab", 1, 5, "Lab Only", 2, 0, 1, 1],
    ["IT301", "Web Technologies", 2, 3, "Both Theory + Lab", 4, 3, 1, 4],
    ["IT302", "Python Programming", 2, 3, "Both Theory + Lab", 3, 2, 1, 3],
    ["IT303", "Data Communication", 2, 3, "Theory Only", 3, 3, 0, 3],
    ["IT304", "Statistics for IT", 2, 3, "Theory Only", 3, 3, 0, 3]
  ];

  const classSubjects = [
    [1, 1, 1, 4], [1, 1, 2, 4], [1, 1, 3, 1], [1, 1, 4, 3], [1, 1, 5, 3],
    [1, 2, 1, 4], [1, 2, 2, 4], [1, 2, 3, 1], [1, 2, 4, 3], [1, 2, 5, 3],
    [2, 3, 6, 4], [2, 3, 7, 4], [2, 3, 8, 3], [2, 3, 9, 3], [2, 3, 10, 1],
    [3, 4, 11, 4], [3, 4, 12, 3], [3, 4, 13, 3], [3, 4, 14, 3]
  ];

  const teacherSubjects = [
    [1, 1, 1, 1], [2, 2, 1, 1], [3, 3, 1, 1], [4, 4, 1, 1], [5, 5, 1, 1],
    [1, 1, 1, 2], [2, 2, 1, 2], [3, 3, 1, 2], [4, 4, 1, 2], [5, 5, 1, 2],
    [6, 6, 2, 3], [7, 7, 2, 3], [8, 8, 2, 3], [6, 9, 2, 3], [3, 10, 2, 3],
    [9, 11, 3, 4], [9, 12, 3, 4], [9, 13, 3, 4], [10, 14, 3, 4]
  ];

  const classrooms = [
    ["Room 101", "Classroom", 60, "Main Block"],
    ["Room 102", "Classroom", 55, "Main Block"],
    ["Room 103", "Classroom", 50, "Main Block"],
    ["Room 104", "Classroom", 48, "Science Block"],
    ["Room 105", "Classroom", 45, "Science Block"],
    ["Lab 201", "Lab", 60, "Tech Block"],
    ["Lab 202", "Lab", 55, "Tech Block"],
    ["Lab 203", "Lab", 50, "Innovation Block"]
  ];

  const slotTimings = [
    [1, "08:00:00", "09:00:00"],
    [2, "09:00:00", "10:00:00"],
    [3, "10:00:00", "11:00:00"],
    [4, "11:00:00", "12:00:00"],
    [5, "14:00:00", "15:00:00"],
    [6, "15:00:00", "16:00:00"],
    [7, "16:00:00", "17:00:00"]
  ];

  const teacherAvailability = buildAvailabilityRows(teachers);

  try {
    await pool.initializeDatabase();
    await connection.beginTransaction();
    await resetTables(connection);

    await connection.query("INSERT INTO departments (name, code) VALUES ?", [departments]);
    await connection.query(
      "INSERT INTO classes (department_id, class_name, semester, academic_year) VALUES ?",
      [classes]
    );
    await connection.query(
      "INSERT INTO sections (class_id, section_name, strength) VALUES ?",
      [sections]
    );
    await connection.query(
      `INSERT INTO teachers
        (teacher_code, full_name, email, phone, department_id, designation, max_lectures_per_day)
       VALUES ?`,
      [teachers]
    );
    await connection.query(
      `INSERT INTO students
        (roll_number, full_name, email, phone, department_id, class_id, section_id)
       VALUES ?`,
      [students]
    );
    await connection.query(
      "INSERT INTO admins (username, password_hash, full_name, email) VALUES ?",
      [[["admin", PASSWORD_HASH, "System Administrator", "admin@example.com"]]]
    );
    await connection.query(
      "INSERT INTO users (username, password_hash, role, teacher_id, student_id) VALUES ?",
      [[
        ["teacher1", PASSWORD_HASH, "teacher", 1, null],
        ["teacher2", PASSWORD_HASH, "teacher", 2, null],
        ["teacher3", PASSWORD_HASH, "teacher", 3, null],
        ["student1", PASSWORD_HASH, "student", null, 1],
        ["student2", PASSWORD_HASH, "student", null, 4],
        ["student3", PASSWORD_HASH, "student", null, 7],
        ["student4", PASSWORD_HASH, "student", null, 10]
      ]]
    );
    await connection.query(
      `INSERT INTO subjects
        (subject_code, subject_name, department_id, semester, subject_type, credits, theory_lectures_per_week, lab_sessions_per_week, lectures_per_week)
       VALUES ?`,
      [subjects]
    );
    await connection.query(
      "INSERT INTO class_subjects (class_id, section_id, subject_id, required_lectures) VALUES ?",
      [classSubjects]
    );
    await connection.query(
      "INSERT INTO teacher_subjects (teacher_id, subject_id, class_id, section_id) VALUES ?",
      [teacherSubjects]
    );
    await connection.query(
      "INSERT INTO classrooms (room_name, room_type, capacity, building) VALUES ?",
      [classrooms]
    );
    await connection.query(
      "INSERT INTO slot_timings (slot_number, start_time, end_time) VALUES ?",
      [slotTimings]
    );
    await connection.query(
      "INSERT INTO timetable_settings (lecture_duration_minutes, lab_duration_minutes) VALUES (60, 120)"
    );
    await connection.query(
      "INSERT INTO teacher_availability (teacher_id, day_of_week, slot_number, is_available) VALUES ?",
      [teacherAvailability]
    );
    await connection.query(
      `INSERT INTO reports (report_name, report_type, generated_by, report_data) VALUES
       ('Balanced Test Dataset', 'Summary', 1, JSON_OBJECT('note', 'Seeded balanced timetable test data'))`
    );

    await connection.commit();
    console.log("Balanced timetable test data inserted successfully.");
  } catch (error) {
    await connection.rollback();
    console.error("Failed to seed test data:", error.message);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

seed();
