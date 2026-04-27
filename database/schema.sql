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
  subject_type ENUM('Theory', 'Lab') NOT NULL DEFAULT 'Theory',
  credits INT NOT NULL DEFAULT 3,
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
(1, 'A', 55),
(1, 'B', 48),
(2, 'A', 52),
(3, 'A', 45);

INSERT INTO teachers (teacher_code, full_name, email, phone, department_id, designation, max_lectures_per_day) VALUES
('T001', 'Dr. Meera Sharma', 'meera.sharma@example.com', '9876543210', 1, 'Professor', 4),
('T002', 'Prof. Arjun Verma', 'arjun.verma@example.com', '9876543211', 1, 'Associate Professor', 5),
('T003', 'Ms. Nisha Rao', 'nisha.rao@example.com', '9876543212', 1, 'Assistant Professor', 5),
('T004', 'Mr. Rohit Singh', 'rohit.singh@example.com', '9876543213', 2, 'Assistant Professor', 5);

INSERT INTO students (roll_number, full_name, email, phone, department_id, class_id, section_id) VALUES
('CSE3A001', 'Aman Gupta', 'aman.gupta@example.com', '9991001001', 1, 1, 1),
('CSE3A002', 'Riya Patel', 'riya.patel@example.com', '9991001002', 1, 1, 1),
('CSE3B001', 'Neha Joshi', 'neha.joshi@example.com', '9991001003', 1, 1, 2),
('CSE5A001', 'Karan Malhotra', 'karan.malhotra@example.com', '9991001004', 1, 2, 3),
('IT3A001', 'Simran Kaur', 'simran.kaur@example.com', '9991001005', 2, 3, 4);

INSERT INTO admins (username, password_hash, full_name, email) VALUES
('admin', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'System Administrator', 'admin@example.com');

INSERT INTO users (username, password_hash, role, teacher_id, student_id) VALUES
('teacher1', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'teacher', 1, NULL),
('teacher2', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'teacher', 2, NULL),
('student1', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 1),
('student2', '$2a$10$x6Vb6Poz2waSPl.X2x.EMO6kjV7/IFqYtQ.6VeDMi1dvjyWkQAPq2', 'student', NULL, 4);

INSERT INTO subjects (subject_code, subject_name, department_id, semester, subject_type, credits, lectures_per_week) VALUES
('CS301', 'Data Structures', 1, 3, 'Theory', 4, 4),
('CS302', 'Database Management Systems', 1, 3, 'Theory', 4, 4),
('CS303', 'Object Oriented Programming Lab', 1, 3, 'Lab', 2, 2),
('CS501', 'Operating Systems', 1, 5, 'Theory', 4, 4),
('IT301', 'Web Technologies', 2, 3, 'Theory', 3, 3);

INSERT INTO class_subjects (class_id, section_id, subject_id, required_lectures) VALUES
(1, 1, 1, 4),
(1, 1, 2, 4),
(1, 1, 3, 2),
(1, 2, 1, 4),
(1, 2, 2, 4),
(2, 3, 4, 4),
(3, 4, 5, 3);

INSERT INTO teacher_subjects (teacher_id, subject_id, class_id, section_id) VALUES
(1, 1, 1, 1),
(2, 2, 1, 1),
(3, 3, 1, 1),
(1, 1, 1, 2),
(2, 2, 1, 2),
(2, 4, 2, 3),
(4, 5, 3, 4);

INSERT INTO classrooms (room_name, room_type, capacity, building) VALUES
('Room 101', 'Classroom', 60, 'Main Block'),
('Room 102', 'Classroom', 55, 'Main Block'),
('Lab 201', 'Lab', 40, 'Tech Block'),
('Lab 202', 'Lab', 35, 'Tech Block');

INSERT INTO teacher_availability (teacher_id, day_of_week, slot_number, is_available) VALUES
(1, 'Monday', 1, 1),
(1, 'Monday', 2, 1),
(1, 'Monday', 3, 1),
(1, 'Tuesday', 1, 1),
(1, 'Tuesday', 2, 1),
(1, 'Wednesday', 2, 1),
(1, 'Thursday', 3, 1),
(1, 'Friday', 1, 1),
(2, 'Monday', 1, 1),
(2, 'Monday', 2, 1),
(2, 'Tuesday', 3, 1),
(2, 'Wednesday', 1, 1),
(2, 'Thursday', 2, 1),
(2, 'Friday', 3, 1),
(3, 'Monday', 4, 1),
(3, 'Tuesday', 4, 1),
(3, 'Wednesday', 4, 1),
(3, 'Thursday', 4, 1),
(4, 'Monday', 1, 1),
(4, 'Wednesday', 2, 1),
(4, 'Friday', 3, 1);

INSERT INTO timetable (
  class_id, section_id, subject_id, teacher_id, classroom_id, day_of_week, slot_number, start_time, end_time, created_by, is_manual_override
) VALUES
(1, 1, 1, 1, 1, 'Monday', 1, '09:00:00', '10:00:00', 1, 0),
(1, 1, 2, 2, 2, 'Monday', 2, '10:00:00', '11:00:00', 1, 0),
(1, 1, 3, 3, 3, 'Tuesday', 4, '13:00:00', '15:00:00', 1, 0),
(2, 3, 4, 2, 1, 'Wednesday', 1, '09:00:00', '10:00:00', 1, 0),
(3, 4, 5, 4, 2, 'Friday', 3, '11:15:00', '12:15:00', 1, 0);

INSERT INTO reports (report_name, report_type, generated_by, report_data) VALUES
('Initial Teacher Workload', 'Teacher Workload', 1, JSON_OBJECT('note', 'Sample workload report')),
('Initial Room Allocation', 'Room Allocation', 1, JSON_OBJECT('note', 'Sample room report'));
