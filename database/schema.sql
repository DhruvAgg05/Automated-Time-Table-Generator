DROP DATABASE IF EXISTS automated_timetable_db;
CREATE DATABASE automated_timetable_db;
USE automated_timetable_db;

CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  department_id INT NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  semester INT NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  CONSTRAINT uq_class UNIQUE (department_id, class_name, semester, academic_year)
);

CREATE TABLE sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  section_name VARCHAR(20) NOT NULL,
  strength INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sections_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT uq_section UNIQUE (class_id, section_name)
);

CREATE TABLE teachers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department_id INT NOT NULL,
  designation VARCHAR(80) NOT NULL,
  max_lectures_per_day INT NOT NULL DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teachers_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  roll_number VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20),
  department_id INT NOT NULL,
  class_id INT NOT NULL,
  section_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_students_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT
);

CREATE TABLE admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('teacher', 'student') NOT NULL,
  teacher_id INT NULL,
  student_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_users_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT chk_user_owner CHECK (
    (role = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL) OR
    (role = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL)
  )
);

CREATE TABLE subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subject_code VARCHAR(20) NOT NULL UNIQUE,
  subject_name VARCHAR(120) NOT NULL,
  department_id INT NOT NULL,
  semester INT NOT NULL,
  subject_type ENUM('Theory Only', 'Lab Only', 'Both Theory + Lab') NOT NULL DEFAULT 'Theory Only',
  credits INT NOT NULL DEFAULT 3,
  theory_lectures_per_week INT NOT NULL DEFAULT 0,
  lab_sessions_per_week INT NOT NULL DEFAULT 0,
  lectures_per_week INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_subjects_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE class_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  section_id INT NOT NULL,
  subject_id INT NOT NULL,
  required_lectures INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_class_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subjects_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT uq_class_subject UNIQUE (section_id, subject_id)
);

CREATE TABLE teacher_subjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  subject_id INT NOT NULL,
  class_id INT NOT NULL,
  section_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_subjects_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subjects_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subjects_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT uq_teacher_subject UNIQUE (teacher_id, subject_id, section_id)
);

CREATE TABLE classrooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_name VARCHAR(50) NOT NULL UNIQUE,
  room_type ENUM('Classroom', 'Lab') NOT NULL DEFAULT 'Classroom',
  capacity INT NOT NULL,
  building VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teacher_availability (
  id INT PRIMARY KEY AUTO_INCREMENT,
  teacher_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  slot_number INT NOT NULL,
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_availability_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
  CONSTRAINT uq_teacher_availability UNIQUE (teacher_id, day_of_week, slot_number)
);

CREATE TABLE slot_timings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  slot_number INT NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE timetable_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lecture_duration_minutes INT NOT NULL DEFAULT 60,
  lab_duration_minutes INT NOT NULL DEFAULT 120,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE extra_lecture_requests (
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
);

CREATE TABLE timetable (
  id INT PRIMARY KEY AUTO_INCREMENT,
  class_id INT NOT NULL,
  section_id INT NOT NULL,
  subject_id INT NOT NULL,
  teacher_id INT NOT NULL,
  classroom_id INT NOT NULL,
  day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  slot_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by INT NULL,
  is_manual_override TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_timetable_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_timetable_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetable_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetable_classroom FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE RESTRICT,
  CONSTRAINT fk_timetable_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
  CONSTRAINT uq_section_slot UNIQUE (section_id, day_of_week, slot_number),
  CONSTRAINT uq_teacher_slot UNIQUE (teacher_id, day_of_week, slot_number),
  CONSTRAINT uq_room_slot UNIQUE (classroom_id, day_of_week, slot_number)
);

CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_name VARCHAR(120) NOT NULL,
  report_type ENUM('Teacher Workload', 'Room Allocation', 'Class Timetable', 'Summary') NOT NULL,
  generated_by INT NULL,
  generated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  report_data JSON NULL,
  CONSTRAINT fk_reports_admin FOREIGN KEY (generated_by) REFERENCES admins(id) ON DELETE SET NULL
);

INSERT INTO departments (name, code) VALUES
('Computer Science and Engineering', 'CSE'),
('Information Technology', 'IT'),
('Electronics and Communication', 'ECE');

INSERT INTO classes (department_id, class_name, semester, academic_year) VALUES
(1, 'B.Tech CSE II Year', 3, '2026-2027'),
(1, 'B.Tech CSE III Year', 5, '2026-2027'),
(2, 'B.Tech IT II Year', 3, '2026-2027');

INSERT INTO sections (class_id, section_name, strength) VALUES
(1, 'A', 48),
(1, 'B', 46),
(2, 'A', 44),
(3, 'A', 42);

INSERT INTO teachers (teacher_code, full_name, email, phone, department_id, designation, max_lectures_per_day) VALUES
('T101', 'Dr. Meera Sharma', 'meera.sharma@example.com', '9876500001', 1, 'Professor', 5),
('T102', 'Prof. Arjun Verma', 'arjun.verma@example.com', '9876500002', 1, 'Associate Professor', 5),
('T103', 'Ms. Nisha Rao', 'nisha.rao@example.com', '9876500003', 1, 'Assistant Professor', 5),
('T104', 'Dr. Kavita Menon', 'kavita.menon@example.com', '9876500004', 1, 'Professor', 5),
('T105', 'Mr. Rahul Joshi', 'rahul.joshi@example.com', '9876500005', 1, 'Assistant Professor', 5),
('T106', 'Dr. Sameer Khan', 'sameer.khan@example.com', '9876500006', 1, 'Professor', 5),
('T107', 'Prof. Priya Singh', 'priya.singh@example.com', '9876500007', 1, 'Associate Professor', 5),
('T108', 'Ms. Anjali Desai', 'anjali.desai@example.com', '9876500008', 1, 'Assistant Professor', 5),
('T109', 'Mr. Vikram Patel', 'vikram.patel@example.com', '9876500009', 2, 'Assistant Professor', 5),
('T110', 'Ms. Sneha Iyer', 'sneha.iyer@example.com', '9876500010', 2, 'Assistant Professor', 5);

INSERT INTO students (roll_number, full_name, email, phone, department_id, class_id, section_id) VALUES
('CSE3A001', 'Aman Gupta', 'aman.gupta@example.com', '9991001001', 1, 1, 1),
('CSE3A002', 'Riya Patel', 'riya.patel@example.com', '9991001002', 1, 1, 1),
('CSE3A003', 'Keshav Nair', 'keshav.nair@example.com', '9991001003', 1, 1, 1),
('CSE3B001', 'Neha Joshi', 'neha.joshi@example.com', '9991001004', 1, 1, 2),
('CSE3B002', 'Tanvi Shah', 'tanvi.shah@example.com', '9991001005', 1, 1, 2),
('CSE3B003', 'Harsh Mehta', 'harsh.mehta@example.com', '9991001006', 1, 1, 2),
('CSE5A001', 'Karan Malhotra', 'karan.malhotra@example.com', '9991001007', 1, 2, 3),
('CSE5A002', 'Ishita Roy', 'ishita.roy@example.com', '9991001008', 1, 2, 3),
('CSE5A003', 'Varun Sethi', 'varun.sethi@example.com', '9991001009', 1, 2, 3),
('IT3A001', 'Simran Kaur', 'simran.kaur@example.com', '9991001010', 2, 3, 4),
('IT3A002', 'Rohan Das', 'rohan.das@example.com', '9991001011', 2, 3, 4),
('IT3A003', 'Pooja Sharma', 'pooja.sharma@example.com', '9991001012', 2, 3, 4);

INSERT INTO admins (username, password_hash, full_name, email, phone) VALUES
('admin', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'System Administrator', 'admin@example.com', '9876500100');

INSERT INTO users (username, password_hash, role, teacher_id, student_id) VALUES
('teacher1', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'teacher', 1, NULL),
('teacher2', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'teacher', 2, NULL),
('teacher3', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'teacher', 3, NULL),
('student1', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 1),
('student2', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 4),
('student3', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 7),
('student4', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 10);

INSERT INTO subjects (subject_code, subject_name, department_id, semester, subject_type, credits, theory_lectures_per_week, lab_sessions_per_week, lectures_per_week) VALUES
('CS301', 'Data Structures', 1, 3, 'Theory Only', 4, 4, 0, 4),
('CS302', 'Database Management Systems', 1, 3, 'Both Theory + Lab', 4, 3, 1, 4),
('CS303', 'Object Oriented Programming Lab', 1, 3, 'Lab Only', 2, 0, 1, 1),
('CS304', 'Discrete Mathematics', 1, 3, 'Theory Only', 3, 3, 0, 3),
('CS305', 'Web Programming', 1, 3, 'Both Theory + Lab', 3, 2, 1, 3),
('CS501', 'Operating Systems', 1, 5, 'Theory Only', 4, 4, 0, 4),
('CS502', 'Computer Networks', 1, 5, 'Both Theory + Lab', 4, 3, 1, 4),
('CS503', 'Software Engineering', 1, 5, 'Theory Only', 3, 3, 0, 3),
('CS504', 'Algorithms', 1, 5, 'Theory Only', 3, 3, 0, 3),
('CS505', 'Java Programming Lab', 1, 5, 'Lab Only', 2, 0, 1, 1),
('IT301', 'Web Technologies', 2, 3, 'Both Theory + Lab', 4, 3, 1, 4),
('IT302', 'Python Programming', 2, 3, 'Both Theory + Lab', 3, 2, 1, 3),
('IT303', 'Data Communication', 2, 3, 'Theory Only', 3, 3, 0, 3),
('IT304', 'Statistics for IT', 2, 3, 'Theory Only', 3, 3, 0, 3);

INSERT INTO class_subjects (class_id, section_id, subject_id, required_lectures) VALUES
(1, 1, 1, 4), (1, 1, 2, 4), (1, 1, 3, 1), (1, 1, 4, 3), (1, 1, 5, 3),
(1, 2, 1, 4), (1, 2, 2, 4), (1, 2, 3, 1), (1, 2, 4, 3), (1, 2, 5, 3),
(2, 3, 6, 4), (2, 3, 7, 4), (2, 3, 8, 3), (2, 3, 9, 3), (2, 3, 10, 1),
(3, 4, 11, 4), (3, 4, 12, 3), (3, 4, 13, 3), (3, 4, 14, 3);

INSERT INTO teacher_subjects (teacher_id, subject_id, class_id, section_id) VALUES
(1, 1, 1, 1), (2, 2, 1, 1), (3, 3, 1, 1), (4, 4, 1, 1), (5, 5, 1, 1),
(1, 1, 1, 2), (2, 2, 1, 2), (3, 3, 1, 2), (4, 4, 1, 2), (5, 5, 1, 2),
(6, 6, 2, 3), (7, 7, 2, 3), (8, 8, 2, 3), (6, 9, 2, 3), (3, 10, 2, 3),
(9, 11, 3, 4), (9, 12, 3, 4), (9, 13, 3, 4), (10, 14, 3, 4);

INSERT INTO classrooms (room_name, room_type, capacity, building) VALUES
('Room 101', 'Classroom', 60, 'Main Block'),
('Room 102', 'Classroom', 55, 'Main Block'),
('Room 103', 'Classroom', 50, 'Main Block'),
('Room 104', 'Classroom', 48, 'Science Block'),
('Room 105', 'Classroom', 45, 'Science Block'),
('Lab 201', 'Lab', 60, 'Tech Block'),
('Lab 202', 'Lab', 55, 'Tech Block'),
('Lab 203', 'Lab', 50, 'Innovation Block');

INSERT INTO teacher_availability (teacher_id, day_of_week, slot_number, is_available) VALUES
(1, 'Monday', 1, 1), (1, 'Monday', 2, 1), (1, 'Monday', 3, 1), (1, 'Monday', 4, 1), (1, 'Monday', 5, 1), (1, 'Monday', 6, 1), (1, 'Monday', 7, 1),
(1, 'Tuesday', 1, 1), (1, 'Tuesday', 2, 1), (1, 'Tuesday', 3, 1), (1, 'Tuesday', 4, 1), (1, 'Tuesday', 5, 1), (1, 'Tuesday', 6, 1), (1, 'Tuesday', 7, 1),
(1, 'Wednesday', 1, 1), (1, 'Wednesday', 2, 1), (1, 'Wednesday', 3, 1), (1, 'Wednesday', 4, 1), (1, 'Wednesday', 5, 1), (1, 'Wednesday', 6, 1), (1, 'Wednesday', 7, 0),
(1, 'Thursday', 1, 1), (1, 'Thursday', 2, 1), (1, 'Thursday', 3, 1), (1, 'Thursday', 4, 1), (1, 'Thursday', 5, 1), (1, 'Thursday', 6, 1), (1, 'Thursday', 7, 1),
(1, 'Friday', 1, 1), (1, 'Friday', 2, 1), (1, 'Friday', 3, 1), (1, 'Friday', 4, 1), (1, 'Friday', 5, 1), (1, 'Friday', 6, 1), (1, 'Friday', 7, 1),
(1, 'Saturday', 1, 1), (1, 'Saturday', 2, 1), (1, 'Saturday', 3, 1), (1, 'Saturday', 4, 1), (1, 'Saturday', 5, 1), (1, 'Saturday', 6, 1), (1, 'Saturday', 7, 1),
(2, 'Monday', 1, 1), (2, 'Monday', 2, 1), (2, 'Monday', 3, 1), (2, 'Monday', 4, 1), (2, 'Monday', 5, 1), (2, 'Monday', 6, 1), (2, 'Monday', 7, 1),
(2, 'Tuesday', 1, 0), (2, 'Tuesday', 2, 1), (2, 'Tuesday', 3, 1), (2, 'Tuesday', 4, 1), (2, 'Tuesday', 5, 1), (2, 'Tuesday', 6, 1), (2, 'Tuesday', 7, 1),
(2, 'Wednesday', 1, 1), (2, 'Wednesday', 2, 1), (2, 'Wednesday', 3, 1), (2, 'Wednesday', 4, 1), (2, 'Wednesday', 5, 1), (2, 'Wednesday', 6, 1), (2, 'Wednesday', 7, 1),
(2, 'Thursday', 1, 1), (2, 'Thursday', 2, 1), (2, 'Thursday', 3, 1), (2, 'Thursday', 4, 1), (2, 'Thursday', 5, 1), (2, 'Thursday', 6, 1), (2, 'Thursday', 7, 0),
(2, 'Friday', 1, 1), (2, 'Friday', 2, 1), (2, 'Friday', 3, 1), (2, 'Friday', 4, 1), (2, 'Friday', 5, 1), (2, 'Friday', 6, 1), (2, 'Friday', 7, 1),
(2, 'Saturday', 1, 1), (2, 'Saturday', 2, 1), (2, 'Saturday', 3, 1), (2, 'Saturday', 4, 1), (2, 'Saturday', 5, 1), (2, 'Saturday', 6, 1), (2, 'Saturday', 7, 1);

INSERT INTO slot_timings (slot_number, start_time, end_time) VALUES
(1, '08:00:00', '09:00:00'),
(2, '09:00:00', '10:00:00'),
(3, '10:00:00', '11:00:00'),
(4, '11:00:00', '12:00:00'),
(5, '14:00:00', '15:00:00'),
(6, '15:00:00', '16:00:00'),
(7, '16:00:00', '17:00:00');

INSERT INTO timetable_settings (lecture_duration_minutes, lab_duration_minutes) VALUES
(60, 120);

INSERT INTO timetable (
  class_id, section_id, subject_id, teacher_id, classroom_id, day_of_week, slot_number, start_time, end_time, created_by, is_manual_override
) VALUES
(1, 1, 1, 1, 1, 'Monday', 2, '09:00:00', '10:00:00', 1, 0),
(1, 1, 2, 2, 6, 'Thursday', 1, '08:00:00', '09:00:00', 1, 0),
(1, 1, 2, 2, 6, 'Thursday', 2, '09:00:00', '10:00:00', 1, 0),
(1, 2, 3, 3, 7, 'Monday', 1, '08:00:00', '09:00:00', 1, 0),
(1, 2, 3, 3, 7, 'Monday', 2, '09:00:00', '10:00:00', 1, 0),
(2, 3, 6, 6, 2, 'Tuesday', 3, '10:00:00', '11:00:00', 1, 0),
(3, 4, 11, 9, 6, 'Wednesday', 1, '08:00:00', '09:00:00', 1, 0),
(3, 4, 11, 9, 6, 'Wednesday', 2, '09:00:00', '10:00:00', 1, 0);

INSERT INTO reports (report_name, report_type, generated_by, report_data) VALUES
('Initial Teacher Workload', 'Teacher Workload', 1, JSON_OBJECT('note', 'Sample workload report')),
('Initial Room Allocation', 'Room Allocation', 1, JSON_OBJECT('note', 'Sample room report'));
