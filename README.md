# Automated Time Table Management System

A complete full-stack academic project for automatic timetable creation and timetable management using **HTML, CSS, JavaScript, Bootstrap, Node.js, Express.js, and MySQL**.

This system is designed for colleges and departments that need a practical way to create, manage, validate, and print weekly timetables while reducing manual work and avoiding common scheduling conflicts.

---

## 1. Project Overview

The **Automated Time Table Management System** is a traditional final-year college project that helps educational institutions manage timetable planning in a structured and efficient way.  
It provides separate access for **Admin**, **Teacher**, and **Student** users and supports both daily operations and advanced scheduling tasks.

The system can:

- manage academic master data such as teachers, students, subjects, departments, sections, and rooms
- automatically generate weekly timetables
- prevent teacher clashes, room clashes, and section clashes
- support subjects that contain both theory and lab in a single subject entry
- allow printable section-wise, teacher-wise, student-wise, and teacher timetable views
- handle temporary extra lecture requests with approval and conflict checking

This project is useful for demonstration, viva explanation, GitHub submission, and final-year project documentation because it follows a clean MVC structure and uses a fully traditional web stack.

---

## 2. Problem Statement

In many colleges, timetable preparation is still handled manually. This process usually takes a lot of time and often creates problems such as:

- the same teacher being assigned in two places at the same time
- the same classroom or lab being allotted more than once in the same slot
- subject lecture requirements not being completed properly
- lab sessions being placed in non-consecutive or unsuitable slots
- difficulty in checking teacher availability and room availability
- difficulty in making temporary scheduling changes

Manual timetable creation becomes even harder when institutions have multiple sections, limited laboratories, teacher availability restrictions, and changing slot timings.

The **Automated Time Table Management System** solves this problem by automating timetable generation, validating scheduling feasibility, detecting conflicts, offering solution suggestions on failure, and giving clear timetable visibility to admin, teachers, and students.

---

## 3. Objectives

- To reduce manual effort in timetable preparation.
- To improve timetable accuracy and consistency.
- To prevent teacher, room, and section clashes automatically.
- To support realistic academic scheduling for theory and lab subjects.
- To provide separate role-based access for admin, teachers, and students.
- To provide printable professional timetable views.
- To support temporary extra lecture and lab session management.
- To make timetable management beginner-friendly and easy to explain in a viva.

---

## 4. Features

### Admin Module

- Secure admin login and logout
- Dashboard with system overview
- Manage teachers: add, edit, delete, view
- Manage students: add, edit, delete, view
- Manage subjects: add, edit, delete, view
- Manage departments, classes, and sections
- Manage classrooms and laboratories
- Manage teacher availability
- Assign teacher to subject
- Assign subject to section
- Customize lecture duration and lab duration
- Customize slot timings
- Generate timetable automatically
- Edit timetable manually
- Delete and regenerate timetable
- View teacher-wise printable timetable
- View teacher free slot grid
- View room free slot grid
- View scheduling support data before manual changes
- Approve or reject extra lecture requests
- Reset teacher and student passwords
- Generate reports and print timetables

### Teacher Module

- Secure teacher login
- View assigned subjects
- View weekly timetable grid
- View daily and weekly schedule
- View free periods
- View own availability
- Request extra lecture or extra lab session
- Check free rooms before requesting
- Cancel pending or approved temporary lecture request before schedule completion
- View notification if a requested slot becomes unavailable
- Update own profile
- Change password

### Student Module

- Secure student login
- View class timetable in weekly grid format
- View subject schedule
- View assigned faculty
- View daily and weekly schedule
- Update own profile
- Change password

### Timetable Engine

- Automatic timetable generation
- Theory-only, lab-only, and theory + lab support in one subject
- Room capacity validation
- Teacher availability validation
- Lab preference for lab rooms
- Consecutive slot allocation for labs
- Smart feasibility checking before generation
- Conflict detection and duplicate prevention
- Balanced scheduling with preference to avoid continuous teacher overload
- Failure reason with solution suggestions

### Extra Lecture / Temporary Lecture System

- Teacher can request extra lecture or lab
- Admin can approve, reject, cancel, or modify room assignment
- Temporary lecture clashes are validated
- Conflicting pending requests are automatically marked for reschedule
- Notification message is shown to affected teacher
- Completed temporary lectures are auto-removed from active scheduling and moved by status

### Reports and Printing

- Teacher workload report
- Room allocation report
- Summary report
- Section timetable print
- Teacher timetable print
- Student timetable print
- Teacher-wise printable timetable
- Clean print layout using `@media print`

### Data Entry Support

- Manual entry forms
- Excel/CSV bulk upload for:
  - teachers
  - students
  - subjects
  - classrooms
- Dummy data seeding for easy testing

---

## 5. Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap 5

### Backend

- Node.js
- Express.js

### Database

- MySQL

### Packages / Tools Used

- `mysql2` for MySQL connection pooling
- `express-session` for session-based authentication
- `bcryptjs` for password hashing
- `multer` for file upload handling
- `xlsx` for Excel/CSV parsing
- `nodemon` for development mode

---

## 6. System Modules

### 6.1 Authentication Module

This module handles role-based login for admin, teacher, and student users.  
It uses session-based authentication and protects routes based on user role.

### 6.2 Admin Management Module

This module is the main control center of the system.  
Admin can manage all master records, configure scheduling settings, generate timetables, approve extra lecture requests, and print reports.

### 6.3 Teacher Management Module

This module stores teacher details, department mapping, workload limits, availability, and subject assignments.  
It also supports teacher-side timetable viewing and temporary lecture requests.

### 6.4 Student Management Module

This module manages student records, roll numbers, class/section mapping, and student-side timetable viewing.

### 6.5 Subject Management Module

This module supports:

- theory-only subjects
- lab-only subjects
- theory + lab subjects in the same record

It stores subject code, name, credits, weekly theory lectures, weekly lab sessions, and department/class assignment.

### 6.6 Classroom and Lab Management Module

This module stores room names, room type, and capacity.  
The timetable engine uses this data to allocate suitable rooms while preventing double booking.

### 6.7 Teacher Availability Module

This module allows admin to mark slot-wise teacher availability.  
The timetable generator respects only those available slots while scheduling.

### 6.8 Timetable Generation Module

This is the core module of the project.  
It automatically creates a timetable after checking slot compatibility, teacher availability, room availability, subject requirements, and lab continuity rules.

### 6.9 Timetable Visibility and Printing Module

This module displays:

- section timetable
- student timetable grid
- teacher timetable grid
- teacher-wise admin timetable

It also provides clean printable layouts that hide non-essential page elements.

### 6.10 Extra Lecture Management Module

This module allows teachers to request temporary lectures or labs for a specific date and slot.  
Admin can approve, reject, cancel, or reassign room allocation while the system checks for conflicts.

### 6.11 Profile Management Module

This module allows admin, teacher, and student users to:

- view their profile
- update basic details
- change password

Admin can also reset teacher and student passwords.

---

## 7. Database Design

The system uses a normalized MySQL schema with proper primary keys, foreign keys, and role-based relationships.

### Main Tables

- `admins`
- `users`
- `teachers`
- `students`
- `departments`
- `classes`
- `sections`
- `subjects`
- `class_subjects`
- `teacher_subjects`
- `teacher_availability`
- `classrooms`
- `timetable`
- `reports`
- `timetable_settings`
- `slot_timings`
- `extra_lecture_requests`

### Important Database Concepts Used

- foreign key relationships for consistency
- unique and normalized mappings for users and academic records
- session-based login data separation
- separate tables for timetable settings and slot timings
- separate table for temporary extra lecture workflow

### Subject Table Supports

- subject name
- subject code
- subject type
- theory lectures per week
- lab sessions per week
- subject credits

This allows one subject record to store both theory and lab requirements together.

---

## 8. Timetable Generation Logic

The timetable engine is designed to be practical, easy to explain, and realistic for college usage.

### Main Logic Flow

1. Load sections, subjects, teacher mappings, availability, room data, slot timings, and timetable settings.
2. Validate whether timetable generation is feasible before final scheduling.
3. Build scheduling tasks based on theory and lab requirements.
4. Prefer stricter tasks such as lab sessions first where consecutive slots are required.
5. Try valid combinations of day, slot, teacher availability, and room allocation.
6. Save only conflict-free assignments.
7. Roll back if timetable cannot be completed correctly.

### Rules Implemented

- A teacher cannot be assigned to two classes at the same time.
- A classroom or lab cannot be allocated twice at the same time.
- A section cannot have two subjects in the same slot.
- Required weekly lectures and lab sessions must be completed.
- Teacher availability must be respected.
- Lab subjects prefer lab rooms.
- Room capacity must be sufficient for the section strength.
- Duplicate scheduling is not allowed.
- Lab sessions are assigned in consecutive slots if required.
- Teacher schedules try to avoid unnecessary back-to-back overload.

### Smart Validation Before Generation

Before timetable generation, the system checks:

- whether lecture duration fits available slots
- whether lab duration fits available consecutive slots
- whether enough classrooms and labs exist
- whether teacher availability is sufficient
- whether subject demand can fit in available weekly capacity
- whether teacher load exceeds realistic availability

### Failure Detection and Suggestions

If generation is not possible, the system stops and shows a clear reason such as:

- not enough classrooms
- not enough lab rooms
- teacher availability too limited
- consecutive lab slots not available
- slot timing mismatch with duration settings

It also provides practical suggestions such as:

- add more rooms
- adjust teacher availability
- reduce weekly lecture load
- update slot timings

This makes the project more professional and suitable for real academic demonstration.

---

## 9. Extra Lecture Management Logic

The system includes a temporary lecture management feature for practical day-to-day college use.

### Workflow

1. Teacher checks own free slots and room availability.
2. Teacher submits an extra lecture or lab request for a specific date.
3. Admin reviews pending requests.
4. Admin approves, rejects, cancels, or assigns a room.
5. System validates:
   - teacher free slot
   - room free slot
   - section slot availability
   - request type and room type
   - overlap with existing timetable
   - overlap with approved temporary requests
6. If one request is approved first, conflicting pending requests are automatically updated and teacher is notified.
7. After the scheduled date/time passes, the temporary lecture is moved out of active use by status cleanup.

### Benefits

- supports makeup classes and extra labs
- prevents temporary scheduling clashes
- gives admin visibility into room and teacher availability
- keeps extra lectures separate from permanent timetable generation logic

---

## 10. Installation Steps

### Step 1: Clone or Download the Project

```bash
git clone <your-repository-url>
cd automated-time-table-management-system
```

If the project is already available locally, open the project folder directly.

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Create MySQL Database

Create a MySQL database with the following name:

```sql
CREATE DATABASE automated_timetable_db;
```

### Step 4: Import Database Schema

Import the SQL file:

```sql
USE automated_timetable_db;
SOURCE database/schema.sql;
```

You can also import [schema.sql](D:\Automated Time Table Generator\database\schema.sql) using MySQL Workbench or phpMyAdmin.

### Step 5: Verify Database Configuration

The project uses the following default configuration in [db.js](D:\Automated Time Table Generator\config\db.js):

```text
host: localhost
user: root
password: root123
database: automated_timetable_db
```

If required, update the values in [db.js](D:\Automated Time Table Generator\config\db.js) or use environment variables:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### Step 6: Optional Balanced Dummy Test Data

To load realistic sample data for timetable testing:

```bash
npm run seed:test-data
```

This creates a balanced academic dataset and generates a working sample timetable.

### Step 7: Run the Project

For normal run:

```bash
npm start
```

For development mode:

```bash
npm run dev
```

### Step 8: Open the Application

Open in browser:

```text
http://localhost:3000
```

---

## 11. Default Login Credentials

All seeded sample accounts use the password:

```text
admin123
```

### Admin Login

- Username: `admin`
- Password: `admin123`
- Role: `admin`

### Teacher Login

- Username: `teacher1`
- Password: `admin123`
- Role: `teacher`

### Student Login

- Username: `student1`
- Password: `admin123`
- Role: `student`

You can use other seeded teacher and student accounts after importing the schema or running the seed script.

---

## 12. Project Folder Structure

```text
project-root/
|
|-- server.js
|-- package.json
|-- package-lock.json
|
|-- config/
|   |-- db.js
|
|-- routes/
|   |-- adminRoutes.js
|   |-- teacherRoutes.js
|   |-- studentRoutes.js
|   |-- subjectRoutes.js
|   |-- classroomRoutes.js
|   |-- timetableRoutes.js
|
|-- controllers/
|   |-- adminController.js
|   |-- teacherController.js
|   |-- studentController.js
|   |-- subjectController.js
|   |-- classroomController.js
|   |-- timetableController.js
|
|-- models/
|   |-- adminModel.js
|   |-- teacherModel.js
|   |-- studentModel.js
|   |-- subjectModel.js
|   |-- classroomModel.js
|   |-- timetableModel.js
|
|-- middleware/
|   |-- authMiddleware.js
|   |-- uploadMiddleware.js
|   |-- excelHelper.js
|
|-- views/
|   |-- login.html
|   |-- dashboard.html
|   |-- teachers.html
|   |-- students.html
|   |-- subjects.html
|   |-- classrooms.html
|   |-- timetable.html
|   |-- reports.html
|   |-- profile.html
|
|-- public/
|   |-- css/
|   |   |-- style.css
|   |-- js/
|   |   |-- app.js
|   |-- images/
|
|-- database/
|   |-- schema.sql
|   |-- seedTestData.js
|
|-- README.md
```

### Folder Explanation

- `server.js`: main application entry point
- `config/`: MySQL configuration and initialization
- `routes/`: route definitions
- `controllers/`: request handling logic
- `models/`: MySQL query and business logic layer
- `middleware/`: authentication, upload, and Excel helper utilities
- `views/`: frontend pages
- `public/`: CSS and JavaScript assets
- `database/`: schema and balanced dummy data seeding

---

## 13. Screenshots

Add screenshots here before final submission or GitHub upload.

### Login Page

`[Insert screenshot here]`

### Admin Dashboard

`[Insert screenshot here]`

### Teacher Management

`[Insert screenshot here]`

### Student Management

`[Insert screenshot here]`

### Subject Management

`[Insert screenshot here]`

### Classroom / Lab Management

`[Insert screenshot here]`

### Automatic Timetable Generation

`[Insert screenshot here]`

### Student Timetable Grid

`[Insert screenshot here]`

### Teacher Timetable Grid

`[Insert screenshot here]`

### Teacher-wise Printable Timetable

`[Insert screenshot here]`

### Extra Lecture Request System

`[Insert screenshot here]`

### Reports Page

`[Insert screenshot here]`

---

## 14. Future Improvements

- Export timetable to PDF and Excel
- Semester-wise and academic-year-wise timetable filtering
- Attendance integration
- Notification through email or SMS
- More advanced optimization using genetic algorithm or heuristic scheduling
- Multi-campus or multi-building room mapping
- Mobile-friendly student quick timetable view
- Faculty substitution management for absent teachers
- Holiday calendar integration
- Audit log for admin actions

---

## 15. Conclusion

The **Automated Time Table Management System** successfully solves the common problems of manual timetable preparation by automating scheduling, validating feasibility, and providing clear timetable visibility for all users.

The project is practical, realistic, and suitable for final-year academic submission because it includes:

- complete CRUD functionality
- role-based access control
- automatic timetable generation
- advanced conflict validation
- temporary lecture handling
- printable professional timetable views
- beginner-friendly MVC structure

This system demonstrates how traditional web technologies can be used to build a useful and reliable academic management application without relying on modern frontend frameworks.

---

## 16. Author

**Project Title:** Automated Time Table Management System  
**Project Type:** Final-Year Academic Project  
**Tech Stack:** HTML, CSS, JavaScript, Bootstrap, Node.js, Express.js, MySQL  
**Prepared For:** College Project Submission / Viva Demonstration  

You may replace this section with your own:

- Student Name
- Roll Number
- Department
- College Name
- Guide / Supervisor Name
- Academic Year

---

## 17. Notes for Viva

- The project follows the MVC pattern.
- The system uses session-based authentication.
- MySQL stores all structured academic and timetable data.
- The timetable engine validates feasibility before generation.
- Theory and lab can be handled in one subject record.
- Temporary extra lectures are managed separately from the permanent timetable.
- The project remains a traditional stack solution without React, Next.js, MongoDB, Firebase, or other disallowed technologies.

