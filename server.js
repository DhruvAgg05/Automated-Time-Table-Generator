const path = require("path");
const express = require("express");
const session = require("express-session");
const db = require("./config/db");

const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const studentRoutes = require("./routes/studentRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const classroomRoutes = require("./routes/classroomRoutes");
const timetableRoutes = require("./routes/timetableRoutes");
const { preventCache, requireAuth } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

function serveProtectedPage(fileName, roles) {
  return (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    if (roles && !roles.includes(req.session.user.role)) {
      return res.redirect("/dashboard");
    }

    return res.sendFile(path.join(__dirname, "views", fileName));
  };
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "timetable-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(preventCache);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/api/admin", adminRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/timetable", timetableRoutes);

app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  return res.redirect("/dashboard");
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/dashboard", requireAuth, serveProtectedPage("dashboard.html"));
app.get("/teachers", requireAuth, serveProtectedPage("teachers.html", ["admin"]));
app.get("/students", requireAuth, serveProtectedPage("students.html", ["admin"]));
app.get("/subjects", requireAuth, serveProtectedPage("subjects.html", ["admin"]));
app.get("/classrooms", requireAuth, serveProtectedPage("classrooms.html", ["admin"]));
app.get("/timetable", requireAuth, serveProtectedPage("timetable.html", ["admin", "teacher", "student"]));
app.get("/reports", requireAuth, serveProtectedPage("reports.html", ["admin"]));
app.get("/profile", requireAuth, serveProtectedPage("profile.html", ["admin", "teacher", "student"]));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

db.initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Automated Time Table Management System running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });
