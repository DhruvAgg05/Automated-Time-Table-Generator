# Automated Time Table Management System

Traditional final-year academic project built strictly with:

- Frontend: HTML, CSS, JavaScript, Bootstrap
- Backend: Node.js, Express.js
- Database: MySQL

This project automatically generates and manages class schedules while preventing teacher clashes, room clashes, duplicate periods, and incomplete weekly lecture allocation.

## Project Features

### Admin Module

- Secure login and logout using session-based authentication
- Dashboard with total teachers, students, subjects, rooms, classes, and recent timetable entries
- Full CRUD for teachers, students, subjects, classrooms
- Department, class, and section setup
- Teacher availability management
- Subject-to-class and teacher-to-subject assignment
- Automatic timetable generation
- Manual timetable override
- Timetable deletion and regeneration
- Teacher workload report
- Room allocation report
- Printable timetable and printable report pages

### Teacher Module

- Teacher login
- View assigned subjects
- View weekly schedule
- View free periods
- View availability data

### Student Module

- Student login
- View weekly schedule
- View assigned faculty
- View subject-wise timetable entries

## Project Structure

```text
project-root/
├── server.js
├── package.json
├── package-lock.json
├── config/
│   └── db.js
├── routes/
├── controllers/
├── models/
├── middleware/
├── views/
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── database/
│   └── schema.sql
└── README.md
```

## Database Design

Main tables included:

- `admins`
- `users`
- `teachers`
- `students`
- `departments`
- `classes`
- `sections`
- `subjects`
- `classrooms`
- `teacher_subjects`
- `teacher_availability`
- `timetable`
- `reports`

Additional normalized helper table:

- `class_subjects`

The schema uses:

- Primary keys
- Foreign keys
- Unique constraints
- Basic normalization for departments, classes, sections, subjects, and allocations
- Dummy sample data for direct demonstration

## Demo Credentials

All sample accounts use password: `admin123`

- Admin: `admin`
- Teacher: `teacher1`
- Teacher: `teacher2`
- Student: `student1`
- Student: `student2`

## Setup Instructions

### 1. Create MySQL Database

Open MySQL and run:

```sql
SOURCE database/schema.sql;
```

Or copy the full SQL content from [database/schema.sql](D:/Automated%20Time%20Table%20Generator/database/schema.sql) and execute it in MySQL Workbench.

### 2. Configure Database Connection

Update the values in [config/db.js](D:/Automated%20Time%20Table%20Generator/config/db.js) if needed:

- `host`
- `user`
- `password`
- `database`

Default database name:

```text
automated_timetable_db
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

### 5. Open in Browser

```text
http://localhost:3000
```

## Important Business Rules Implemented

- A teacher cannot be scheduled in two places at the same time
- A classroom cannot be allocated to two classes at the same time
- A section cannot have two subjects in the same slot
- Required subject lectures per week must be completed
- Teacher availability is checked before allocation
- Lab subjects prefer lab rooms
- Room capacity is checked against section strength
- Admin can manually edit generated timetable entries
- Duplicate schedule entries are blocked by both logic and database constraints

## Timetable Generation Logic

The timetable generator in [models/timetableModel.js](D:/Automated%20Time%20Table%20Generator/models/timetableModel.js) uses a simple greedy algorithm designed for easy viva explanation:

1. Load sections, class-subject mapping, teacher-subject mapping, teacher availability, and rooms.
2. For each section, collect all required subjects and the number of lectures needed per week.
3. Try day-by-day and slot-by-slot allocation from Monday to Saturday.
4. Before assigning a period, check:
   - teacher is available
   - teacher is not already busy in that slot
   - section is not already busy
   - room is free
   - room type and capacity are suitable
   - teacher daily load does not exceed limit
5. Save successful allocations into the `timetable` table.
6. If any subject cannot be fully scheduled, rollback the transaction and show an error.

This logic is simple, deterministic, and easy to present in a final-year viva.

## Main Routes

### Authentication

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`

### Admin and Reports

- `GET /api/admin/dashboard`
- `GET /api/admin/teacher-workload`
- `GET /api/admin/room-allocation`
- `GET /api/admin/reports`

### Teachers

- `GET /api/teachers`
- `POST /api/teachers`
- `PUT /api/teachers/:id`
- `DELETE /api/teachers/:id`
- `GET /api/teachers/:id/availability`
- `POST /api/teachers/:id/availability`
- `GET /api/teachers/portal/me`

### Students

- `GET /api/students`
- `POST /api/students`
- `PUT /api/students/:id`
- `DELETE /api/students/:id`
- `GET /api/students/portal/me`

### Subjects and Academic Setup

- `GET /api/subjects`
- `POST /api/subjects`
- `PUT /api/subjects/:id`
- `DELETE /api/subjects/:id`
- `GET /api/subjects/reference-data`
- `POST /api/subjects/class-assignments`
- `POST /api/subjects/teacher-assignments`

### Classrooms

- `GET /api/classrooms`
- `POST /api/classrooms`
- `PUT /api/classrooms/:id`
- `DELETE /api/classrooms/:id`
- `GET /api/classrooms/usage/report`

### Timetable

- `GET /api/timetable`
- `POST /api/timetable/generate`
- `PUT /api/timetable/:id`
- `DELETE /api/timetable/:id`
- `DELETE /api/timetable`
- `GET /api/timetable/section/:sectionId`
- `GET /api/timetable/reports/summary`

## Testing Instructions

### Manual Functional Testing

1. Import the SQL schema and sample data.
2. Start the application using `npm start`.
3. Login as admin and verify dashboard counts.
4. Add, edit, and delete teachers, students, subjects, and classrooms.
5. Set teacher availability.
6. Create class-subject and teacher-subject assignments.
7. Click `Generate Timetable Automatically`.
8. Verify that:
   - no teacher appears in two places at the same time
   - no room is repeated in the same slot
   - lab subjects are placed in labs when available
   - room capacity is enough for the assigned section
9. Open the timetable page and test manual override.
10. Open reports and generate workload and room allocation reports.
11. Print the timetable and reports using browser print.
12. Login as teacher and student to verify role-specific schedules.

### Basic Code Verification Completed

- `node --check` run successfully on all project JavaScript files
- `npm install` completed successfully and generated `package-lock.json`

## Viva Explanation Notes

### Problem Statement

Manual timetable creation takes time and often creates conflicts between teachers, classrooms, and subjects. This system automates the process and reduces scheduling errors.

### Why This Project Is Useful

- Reduces manual effort
- Improves scheduling accuracy
- Prevents clashes automatically
- Provides one system for admin, teachers, and students

### Technologies Used

- HTML, CSS, JavaScript, Bootstrap for frontend
- Node.js and Express.js for backend
- MySQL for relational data storage
- Express Session for session-based login
- MySQL connection pooling using `mysql2`

### MVC Pattern Used

- `routes/` receives HTTP requests
- `controllers/` handles request logic
- `models/` communicates with MySQL
- `views/` contains the frontend pages

### How Conflict Prevention Works

- Unique constraints in MySQL prevent duplicate room, teacher, and section slot allocation
- Business logic checks availability before inserting timetable rows
- Timetable generation runs inside a database transaction
- On failure, the transaction is rolled back

### Possible Future Improvements

- Excel export
- More advanced optimization algorithm
- Semester-wise filtering
- Attendance integration
- Notification system

## Notes

- This project is intentionally beginner-friendly for academic submission and viva presentation.
- The UI is built with plain HTML, Bootstrap, and vanilla JavaScript only.
- No React, Vue, Angular, Next.js, MongoDB, Firebase, or other disallowed technologies are used.
