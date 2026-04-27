const API = {
  admin: "/api/admin",
  teachers: "/api/teachers",
  students: "/api/students",
  subjects: "/api/subjects",
  classrooms: "/api/classrooms",
  timetable: "/api/timetable"
};

const SLOT_LABELS = {
  1: "09:00 - 10:00",
  2: "10:00 - 11:00",
  3: "11:15 - 12:15",
  4: "13:00 - 14:00",
  5: "14:00 - 15:00",
  6: "15:15 - 16:15"
};

let CURRENT_USER = null;

document.addEventListener("DOMContentLoaded", async () => {
  const page = document.body.dataset.page;

  if (page !== "login") {
    await hydrateLayout();
  }

  if (page === "login") {
    initLoginPage();
  }

  if (page === "dashboard") {
    initDashboard();
  }

  if (page === "teachers") {
    initTeachersPage();
  }

  if (page === "students") {
    initStudentsPage();
  }

  if (page === "subjects") {
    initSubjectsPage();
  }

  if (page === "classrooms") {
    initClassroomsPage();
  }

  if (page === "timetable") {
    initTimetablePage();
  }

  if (page === "reports") {
    initReportsPage();
  }
});

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function showMessage(targetId, message, type = "success") {
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
}

function fillSelect(elementId, items, valueKey, labelBuilder, placeholder = "Select") {
  const select = document.getElementById(elementId);
  if (!select) {
    return;
  }

  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = labelBuilder(item);
    select.appendChild(option);
  });
}

function bindSearch(inputId, tableId) {
  const input = document.getElementById(inputId);
  const table = document.getElementById(tableId);

  if (!input || !table) {
    return;
  }

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    const rows = table.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
    });
  });
}

async function hydrateLayout() {
  try {
    const result = await apiFetch(`${API.admin}/me`);
    const user = result.user;
    CURRENT_USER = user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const nameNode = document.getElementById("currentUserName");
    const roleNode = document.getElementById("currentUserRole");
    if (nameNode) nameNode.textContent = user.name;
    if (roleNode) roleNode.textContent = user.role.toUpperCase();

    document.querySelectorAll("[data-role-link]").forEach((link) => {
      const allowed = link.dataset.roleLink.split(",");
      link.classList.toggle("hidden", !allowed.includes(user.role));
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await apiFetch(`${API.admin}/logout`, { method: "POST" });
        window.location.href = "/login";
      });
    }
  } catch (error) {
    window.location.href = "/login";
  }
}

function initLoginPage() {
  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await apiFetch(`${API.admin}/login`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage("loginMessage", result.message);
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 600);
    } catch (error) {
      showMessage("loginMessage", error.message, "danger");
    }
  });
}

async function initDashboard() {
  const userResult = await apiFetch(`${API.admin}/me`);
  const user = userResult.user;

  if (user.role === "admin") {
    const result = await apiFetch(`${API.admin}/dashboard`);
    document.getElementById("adminDashboard").classList.remove("hidden");
    renderMetricCards(result.stats);
    renderRecentTimetable(result.recentTimetable);
    return;
  }

  if (user.role === "teacher") {
    const result = await apiFetch(`${API.teachers}/portal/me`);
    document.getElementById("teacherDashboard").classList.remove("hidden");
    document.getElementById("teacherSubjectCount").textContent = result.data.subjects.length;
    document.getElementById("teacherScheduleCount").textContent = result.data.schedule.length;
    document.getElementById("teacherFreeCount").textContent = result.data.freePeriods.length;
    document.getElementById("teacherAssignments").innerHTML = result.data.subjects
      .map((item) => `<li class="list-group-item">${item.subject_code} - ${item.subject_name} (${item.class_name} ${item.section_name})</li>`)
      .join("");
    document.getElementById("teacherDaySchedule").innerHTML = renderScheduleList(result.data.schedule);
    return;
  }

  const result = await apiFetch(`${API.students}/portal/me`);
  document.getElementById("studentDashboard").classList.remove("hidden");
  document.getElementById("studentScheduleCount").textContent = result.data.length;
  document.getElementById("studentSubjectCount").textContent = new Set(result.data.map((item) => item.subject_name)).size;
  document.getElementById("studentFacultyCount").textContent = new Set(result.data.map((item) => item.teacher_name)).size;
  document.getElementById("studentScheduleList").innerHTML = renderScheduleList(result.data);
}

function renderMetricCards(stats) {
  const metrics = [
    { label: "Teachers", value: stats.teachers },
    { label: "Students", value: stats.students },
    { label: "Subjects", value: stats.subjects },
    { label: "Rooms", value: stats.rooms },
    { label: "Classes", value: stats.classes },
    { label: "Timetable Entries", value: stats.timetableEntries }
  ];

  document.getElementById("metricCards").innerHTML = metrics
    .map(
      (item) => `<div class="col-md-4 col-lg-2">
        <div class="card dashboard-card h-100">
          <div class="card-body">
            <p class="text-muted mb-2">${item.label}</p>
            <div class="card-metric">${item.value}</div>
          </div>
        </div>
      </div>`
    )
    .join("");
}

function renderRecentTimetable(entries) {
  document.getElementById("recentTimetableRows").innerHTML = entries
    .map(
      (item) => `<tr>
        <td>${item.class_name} ${item.section_name}</td>
        <td>${item.subject_name}</td>
        <td>${item.teacher_name}</td>
        <td>${item.room_name}</td>
        <td>${item.day_of_week}</td>
        <td>${SLOT_LABELS[item.slot_number]}</td>
      </tr>`
    )
    .join("");
}

function renderScheduleList(schedule) {
  if (!schedule.length) {
    return '<li class="list-group-item">No schedule data available.</li>';
  }

  return schedule
    .map(
      (item) => `<li class="list-group-item d-flex justify-content-between align-items-start">
        <div>
          <strong>${item.day_of_week} | ${SLOT_LABELS[item.slot_number] || item.slot_number}</strong><br>
          ${item.subject_name} ${item.subject_code ? `(${item.subject_code})` : ""}<br>
          ${item.class_name ? `${item.class_name} ${item.section_name}` : item.teacher_name || ""}
        </div>
        <span class="badge text-bg-primary">${item.room_name || item.teacher_name || "Assigned"}</span>
      </li>`
    )
    .join("");
}

async function initTeachersPage() {
  bindSearch("teacherSearch", "teachersTable");
  await populateCommonReferenceSelects();
  await loadTeachers();

  document.getElementById("teacherForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = payload.id;
    delete payload.id;
    payload.max_lectures_per_day = Number(payload.max_lectures_per_day);

    const method = id ? "PUT" : "POST";
    const url = id ? `${API.teachers}/${id}` : API.teachers;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("teacherMessage", result.message);
    form.reset();
    await loadTeachers();
  });

  document.getElementById("availabilityForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const teacherId = document.getElementById("availabilityTeacherId").value;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const slots = [];
    days.forEach((day) => {
      for (let slot = 1; slot <= 6; slot += 1) {
        if (document.getElementById(`av-${day}-${slot}`).checked) {
          slots.push({ day_of_week: day, slot_number: slot, is_available: true });
        }
      }
    });

    const result = await apiFetch(`${API.teachers}/${teacherId}/availability`, {
      method: "POST",
      body: JSON.stringify({ slots })
    });
    showMessage("teacherMessage", result.message);
  });

  document.getElementById("availabilityTeacherId").addEventListener("change", async (event) => {
    if (!event.target.value) return;
    const result = await apiFetch(`${API.teachers}/${event.target.value}/availability`);
    populateAvailabilityGrid(result.data);
  });
}

async function loadTeachers() {
  const result = await apiFetch(API.teachers);
  const tbody = document.getElementById("teachersRows");
  const teachers = result.data;

  fillSelect("availabilityTeacherId", teachers, "id", (item) => `${item.full_name} (${item.teacher_code})`, "Select Teacher");

  tbody.innerHTML = teachers
    .map(
      (teacher) => `<tr>
        <td>${teacher.teacher_code}</td>
        <td>${teacher.full_name}</td>
        <td>${teacher.department_name}</td>
        <td>${teacher.designation}</td>
        <td>${teacher.email}</td>
        <td>${teacher.max_lectures_per_day}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editTeacher(${JSON.stringify(teacher)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacher(${teacher.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}

function populateAvailabilityGrid(slots) {
  document.querySelectorAll('[id^="av-"]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  slots.forEach((slot) => {
    const checkbox = document.getElementById(`av-${slot.day_of_week}-${slot.slot_number}`);
    if (checkbox) {
      checkbox.checked = Boolean(slot.is_available);
    }
  });
}

window.editTeacher = function editTeacher(teacher) {
  Object.entries(teacher).forEach(([key, value]) => {
    const input = document.querySelector(`#teacherForm [name="${key}"]`);
    if (input) input.value = value ?? "";
  });
};

window.deleteTeacher = async function deleteTeacher(id) {
  if (!window.confirm("Delete this teacher record?")) return;
  const result = await apiFetch(`${API.teachers}/${id}`, { method: "DELETE" });
  showMessage("teacherMessage", result.message);
  await loadTeachers();
};

async function initStudentsPage() {
  bindSearch("studentSearch", "studentsTable");
  await populateCommonReferenceSelects();
  await loadStudents();

  document.getElementById("studentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    const payload = Object.fromEntries(new FormData(form).entries());
    const id = payload.id;
    delete payload.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.students}/${id}` : API.students;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("studentMessage", result.message);
    form.reset();
    await loadStudents();
  });
}

async function loadStudents() {
  const result = await apiFetch(API.students);
  document.getElementById("studentsRows").innerHTML = result.data
    .map(
      (student) => `<tr>
        <td>${student.roll_number}</td>
        <td>${student.full_name}</td>
        <td>${student.department_name}</td>
        <td>${student.class_name}</td>
        <td>${student.section_name}</td>
        <td>${student.email}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editStudent(${JSON.stringify(student)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent(${student.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}

window.editStudent = function editStudent(student) {
  Object.entries(student).forEach(([key, value]) => {
    const input = document.querySelector(`#studentForm [name="${key}"]`);
    if (input) input.value = value ?? "";
  });
};

window.deleteStudent = async function deleteStudent(id) {
  if (!window.confirm("Delete this student record?")) return;
  const result = await apiFetch(`${API.students}/${id}`, { method: "DELETE" });
  showMessage("studentMessage", result.message);
  await loadStudents();
};

async function initSubjectsPage() {
  bindSearch("subjectSearch", "subjectsTable");
  await populateCommonReferenceSelects();
  await loadSubjectReferenceData();

  document.getElementById("subjectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const id = payload.id;
    delete payload.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.subjects}/${id}` : API.subjects;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("subjectMessage", result.message);
    event.target.reset();
    await loadSubjectReferenceData();
  });

  document.getElementById("departmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const id = payload.id;
    delete payload.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.subjects}/departments/${id}` : `${API.subjects}/departments`;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("subjectMessage", result.message);
    event.target.reset();
    await refreshReferenceData();
  });

  document.getElementById("classForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const id = payload.id;
    delete payload.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.subjects}/classes/${id}` : `${API.subjects}/classes`;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("subjectMessage", result.message);
    event.target.reset();
    await refreshReferenceData();
  });

  document.getElementById("sectionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const id = payload.id;
    delete payload.id;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.subjects}/sections/${id}` : `${API.subjects}/sections`;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("subjectMessage", result.message);
    event.target.reset();
    await refreshReferenceData();
  });

  document.getElementById("classAssignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    payload.required_lectures = Number(payload.required_lectures);
    const result = await apiFetch(`${API.subjects}/class-assignments`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showMessage("subjectMessage", result.message);
    await loadSubjectReferenceData();
  });

  document.getElementById("teacherAssignmentForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const result = await apiFetch(`${API.subjects}/teacher-assignments`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    showMessage("subjectMessage", result.message);
    await loadSubjectReferenceData();
  });
}

async function refreshReferenceData() {
  await populateCommonReferenceSelects();
  await loadSubjectReferenceData();
}

async function loadSubjectReferenceData() {
  const result = await apiFetch(`${API.subjects}/reference-data`);
  const { departments, classes, sections, subjects, classAssignments, teacherAssignments } = result.data;

  fillSelect("subjectDepartment", departments, "id", (item) => item.name, "Select Department");
  fillSelect("departmentSelectForClass", departments, "id", (item) => item.name, "Select Department");
  fillSelect("classSelectForSection", classes, "id", (item) => item.class_name, "Select Class");
  fillSelect("assignmentClass", classes, "id", (item) => item.class_name, "Select Class");
  fillSelect("assignmentSection", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("assignmentSubject", subjects, "id", (item) => `${item.subject_code} - ${item.subject_name}`, "Select Subject");
  fillSelect("teacherAssignmentClass", classes, "id", (item) => item.class_name, "Select Class");
  fillSelect("teacherAssignmentSection", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("teacherAssignmentSubject", subjects, "id", (item) => `${item.subject_code} - ${item.subject_name}`, "Select Subject");

  document.getElementById("subjectsRows").innerHTML = subjects
    .map(
      (subject) => `<tr>
        <td>${subject.subject_code}</td>
        <td>${subject.subject_name}</td>
        <td>${subject.department_name}</td>
        <td>${subject.subject_type}</td>
        <td>${subject.lectures_per_week}</td>
        <td>${subject.credits}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editSubject(${JSON.stringify(subject)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSubject(${subject.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");

  document.getElementById("departmentList").innerHTML = departments
    .map(
      (item) => `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>${item.name}<br><small class="text-muted">${item.code}</small></div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick='editDepartment(${JSON.stringify(item)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteDepartment(${item.id})">Delete</button>
        </div>
      </li>`
    )
    .join("");
  document.getElementById("classList").innerHTML = classes
    .map(
      (item) => `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>${item.class_name}<br><small class="text-muted">Semester ${item.semester} | ${item.academic_year}</small></div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick='editClassItem(${JSON.stringify(item)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteClassItem(${item.id})">Delete</button>
        </div>
      </li>`
    )
    .join("");
  document.getElementById("sectionList").innerHTML = sections
    .map(
      (item) => `<li class="list-group-item d-flex justify-content-between align-items-center">
        <div>${item.class_name} - Section ${item.section_name}<br><small class="text-muted">Strength: ${item.strength}</small></div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-primary" onclick='editSectionItem(${JSON.stringify(item)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSectionItem(${item.id})">Delete</button>
        </div>
      </li>`
    )
    .join("");
  document.getElementById("classAssignmentsList").innerHTML = classAssignments
    .map((item) => `<li class="list-group-item">${item.class_name} ${item.section_name} -> ${item.subject_name} (${item.required_lectures}/week)</li>`)
    .join("");
  document.getElementById("teacherAssignmentsList").innerHTML = teacherAssignments
    .map((item) => `<li class="list-group-item">${item.teacher_name} -> ${item.subject_name} (${item.class_name} ${item.section_name})</li>`)
    .join("");
}

window.editSubject = function editSubject(subject) {
  Object.entries(subject).forEach(([key, value]) => {
    const input = document.querySelector(`#subjectForm [name="${key}"]`);
    if (input) input.value = value ?? "";
  });
};

window.deleteSubject = async function deleteSubject(id) {
  if (!window.confirm("Delete this subject?")) return;
  const result = await apiFetch(`${API.subjects}/${id}`, { method: "DELETE" });
  showMessage("subjectMessage", result.message);
  await loadSubjectReferenceData();
};

window.editDepartment = function editDepartment(item) {
  const form = document.getElementById("departmentForm");
  form.querySelector('[name="id"]').value = item.id;
  form.querySelector('[name="name"]').value = item.name;
  form.querySelector('[name="code"]').value = item.code;
};

window.deleteDepartment = async function deleteDepartment(id) {
  if (!window.confirm("Delete this department?")) return;
  const result = await apiFetch(`${API.subjects}/departments/${id}`, { method: "DELETE" });
  showMessage("subjectMessage", result.message);
  await refreshReferenceData();
};

window.editClassItem = function editClassItem(item) {
  const form = document.getElementById("classForm");
  form.querySelector('[name="id"]').value = item.id;
  form.querySelector('[name="department_id"]').value = item.department_id;
  form.querySelector('[name="class_name"]').value = item.class_name;
  form.querySelector('[name="semester"]').value = item.semester;
  form.querySelector('[name="academic_year"]').value = item.academic_year;
};

window.deleteClassItem = async function deleteClassItem(id) {
  if (!window.confirm("Delete this class?")) return;
  const result = await apiFetch(`${API.subjects}/classes/${id}`, { method: "DELETE" });
  showMessage("subjectMessage", result.message);
  await refreshReferenceData();
};

window.editSectionItem = function editSectionItem(item) {
  const form = document.getElementById("sectionForm");
  form.querySelector('[name="id"]').value = item.id;
  form.querySelector('[name="class_id"]').value = item.class_id;
  form.querySelector('[name="section_name"]').value = item.section_name;
  form.querySelector('[name="strength"]').value = item.strength;
};

window.deleteSectionItem = async function deleteSectionItem(id) {
  if (!window.confirm("Delete this section?")) return;
  const result = await apiFetch(`${API.subjects}/sections/${id}`, { method: "DELETE" });
  showMessage("subjectMessage", result.message);
  await refreshReferenceData();
};

async function initClassroomsPage() {
  bindSearch("roomSearch", "classroomsTable");
  await loadClassrooms();

  document.getElementById("classroomForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target).entries());
    const id = payload.id;
    delete payload.id;
    payload.capacity = Number(payload.capacity);
    const method = id ? "PUT" : "POST";
    const url = id ? `${API.classrooms}/${id}` : API.classrooms;
    const result = await apiFetch(url, { method, body: JSON.stringify(payload) });
    showMessage("classroomMessage", result.message);
    event.target.reset();
    await loadClassrooms();
  });
}

async function loadClassrooms() {
  const [roomsResult, usageResult] = await Promise.all([
    apiFetch(API.classrooms),
    apiFetch(`${API.classrooms}/usage/report`)
  ]);

  document.getElementById("classroomsRows").innerHTML = roomsResult.data
    .map(
      (room) => `<tr>
        <td>${room.room_name}</td>
        <td>${room.room_type}</td>
        <td>${room.capacity}</td>
        <td>${room.building || "-"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editClassroom(${JSON.stringify(room)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteClassroom(${room.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");

  document.getElementById("roomUsageList").innerHTML = usageResult.data
    .map((item) => `<li class="list-group-item">${item.room_name} - ${item.total_allocations} allocations</li>`)
    .join("");
}

window.editClassroom = function editClassroom(room) {
  Object.entries(room).forEach(([key, value]) => {
    const input = document.querySelector(`#classroomForm [name="${key}"]`);
    if (input) input.value = value ?? "";
  });
};

window.deleteClassroom = async function deleteClassroom(id) {
  if (!window.confirm("Delete this room?")) return;
  const result = await apiFetch(`${API.classrooms}/${id}`, { method: "DELETE" });
  showMessage("classroomMessage", result.message);
  await loadClassrooms();
};

async function initTimetablePage() {
  bindSearch("timetableSearch", "timetableTable");
  document.getElementById("printTimetableBtn").addEventListener("click", () => window.print());

  if (CURRENT_USER.role === "admin") {
    await populateCommonReferenceSelects();
    await loadTimetablePage();

    document.getElementById("generateTimetableBtn").addEventListener("click", async () => {
      const result = await apiFetch(`${API.timetable}/generate`, { method: "POST" });
      showMessage("timetableMessage", result.message);
      await loadTimetablePage();
    });

    document.getElementById("clearTimetableBtn").addEventListener("click", async () => {
      if (!window.confirm("Delete and clear the full timetable?")) return;
      const result = await apiFetch(API.timetable, { method: "DELETE" });
      showMessage("timetableMessage", result.message);
      await loadTimetablePage();
    });

    document.getElementById("timetableEditForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const id = payload.id;
      delete payload.id;
      payload.start_time = payload.start_time || "09:00:00";
      payload.end_time = payload.end_time || "10:00:00";
      const result = await apiFetch(`${API.timetable}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showMessage("timetableMessage", result.message);
      await loadTimetablePage();
    });

    document.getElementById("sectionGridSelect").addEventListener("change", async (event) => {
      if (!event.target.value) return;
      const result = await apiFetch(`${API.timetable}/section/${event.target.value}`);
      renderTimetableGrid(result.data);
    });

    return;
  }

  document.getElementById("generateTimetableBtn").classList.add("hidden");
  document.getElementById("clearTimetableBtn").classList.add("hidden");
  document.getElementById("manualOverridePanel").classList.add("hidden");

  if (CURRENT_USER.role === "teacher") {
    const result = await apiFetch(`${API.teachers}/portal/me`);
    renderPortalTimetableRows(result.data.schedule, "teacher");
    renderTimetableGrid(result.data.schedule);
    document.getElementById("sectionGridPanel").classList.add("hidden");
    return;
  }

  const result = await apiFetch(`${API.students}/portal/me`);
  renderPortalTimetableRows(result.data, "student");
  renderTimetableGrid(result.data);
  document.getElementById("sectionGridPanel").classList.add("hidden");
}

async function loadTimetablePage() {
  const [timetableResult, referenceData, teacherData, roomData] = await Promise.all([
    apiFetch(API.timetable),
    apiFetch(`${API.subjects}/reference-data`),
    apiFetch(API.teachers),
    apiFetch(API.classrooms)
  ]);

  const rows = timetableResult.data;
  const { classes, sections, subjects } = referenceData.data;

  fillSelect("editClassId", classes, "id", (item) => item.class_name, "Select Class");
  fillSelect("editSectionId", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("editSubjectId", subjects, "id", (item) => `${item.subject_code} - ${item.subject_name}`, "Select Subject");
  fillSelect("editTeacherId", teacherData.data, "id", (item) => item.full_name, "Select Teacher");
  fillSelect("editClassroomId", roomData.data, "id", (item) => item.room_name, "Select Room");
  fillSelect("sectionGridSelect", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");

  document.getElementById("timetableRows").innerHTML = rows
    .map(
      (item) => `<tr>
        <td>${item.class_name} ${item.section_name}</td>
        <td>${item.subject_name}</td>
        <td>${item.teacher_name}</td>
        <td>${item.room_name}</td>
        <td>${item.day_of_week}</td>
        <td>${SLOT_LABELS[item.slot_number]}</td>
        <td>${item.is_manual_override ? "Manual" : "Auto"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editTimetableEntry(${JSON.stringify(item)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteTimetableEntry(${item.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}

window.editTimetableEntry = function editTimetableEntry(entry) {
  document.getElementById("editTimetableId").value = entry.id;
  document.getElementById("editClassId").value = entry.class_id;
  document.getElementById("editSectionId").value = entry.section_id;
  document.getElementById("editSubjectId").value = entry.subject_id;
  document.getElementById("editTeacherId").value = entry.teacher_id;
  document.getElementById("editClassroomId").value = entry.classroom_id;
  document.getElementById("editDay").value = entry.day_of_week;
  document.getElementById("editSlot").value = entry.slot_number;
  document.getElementById("editStartTime").value = String(entry.start_time).slice(0, 5);
  document.getElementById("editEndTime").value = String(entry.end_time).slice(0, 5);
};

window.deleteTimetableEntry = async function deleteTimetableEntry(id) {
  if (!window.confirm("Delete this timetable entry?")) return;
  const result = await apiFetch(`${API.timetable}/${id}`, { method: "DELETE" });
  showMessage("timetableMessage", result.message);
  await loadTimetablePage();
};

function renderTimetableGrid(entries) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const slots = [1, 2, 3, 4, 5, 6];

  const html = `<table class="table table-bordered timetable-grid">
    <thead>
      <tr>
        <th>Time / Day</th>
        ${days.map((day) => `<th>${day}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${slots
        .map(
          (slot) => `<tr>
            <th>${SLOT_LABELS[slot]}</th>
            ${days
              .map((day) => {
                const match = entries.find((item) => item.day_of_week === day && Number(item.slot_number) === slot);
                return `<td>${match ? `<div class="grid-cell"><strong>${match.subject_name}</strong><br>${match.teacher_name || match.class_name || ""}<br>${match.room_name || ""}</div>` : "-"}</td>`;
              })
              .join("")}
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;

  document.getElementById("gridContainer").innerHTML = html;
}

function renderPortalTimetableRows(entries, role) {
  document.getElementById("timetableRows").innerHTML = entries
    .map(
      (item) => `<tr>
        <td>${item.class_name ? `${item.class_name} ${item.section_name}` : "-"}</td>
        <td>${item.subject_name}</td>
        <td>${role === "teacher" ? "Self" : item.teacher_name}</td>
        <td>${item.room_name || "-"}</td>
        <td>${item.day_of_week}</td>
        <td>${SLOT_LABELS[item.slot_number] || item.slot_number}</td>
        <td>${role === "teacher" ? "Teacher View" : "Student View"}</td>
        <td class="no-print">View Only</td>
      </tr>`
    )
    .join("");
}

async function initReportsPage() {
  document.getElementById("teacherWorkloadBtn").addEventListener("click", async () => {
    const result = await apiFetch(`${API.admin}/teacher-workload`);
    renderSimpleTable("reportsOutput", ["Teacher", "Designation", "Assigned Periods", "Sections"], result.data.map((item) => [
      item.full_name,
      item.designation,
      item.assigned_periods,
      item.assigned_sections
    ]));
  });

  document.getElementById("roomAllocationBtn").addEventListener("click", async () => {
    const result = await apiFetch(`${API.admin}/room-allocation`);
    renderSimpleTable("reportsOutput", ["Room", "Type", "Capacity", "Booked Slots"], result.data.map((item) => [
      item.room_name,
      item.room_type,
      item.capacity,
      item.booked_slots
    ]));
  });

  document.getElementById("summaryReportBtn").addEventListener("click", async () => {
    const result = await apiFetch(`${API.timetable}/reports/summary`);
    renderSimpleTable("reportsOutput", ["Teacher", "Periods"], result.data.teacherWorkload.map((item) => [
      item.full_name,
      item.assigned_periods
    ]));
    document.getElementById("reportsMeta").innerHTML = `<p class="mb-0">Recent saved reports: ${result.data.recentReports.length}</p>`;
  });

  document.getElementById("printReportBtn").addEventListener("click", () => window.print());

  const reports = await apiFetch(`${API.admin}/reports`);
  document.getElementById("savedReportsList").innerHTML = reports.data
    .map((item) => `<li class="list-group-item">${item.report_name} | ${item.report_type} | ${new Date(item.generated_on).toLocaleString()}</li>`)
    .join("");
}

function renderSimpleTable(targetId, headers, rows) {
  const table = `<div class="table-responsive">
    <table class="table table-striped">
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((item) => `<td>${item}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>`;

  document.getElementById(targetId).innerHTML = table;
}

async function populateCommonReferenceSelects() {
  const [departments, classes, sections, teachers] = await Promise.all([
    apiFetch(`${API.subjects}/departments/all`),
    apiFetch(`${API.subjects}/classes/all`),
    apiFetch(`${API.subjects}/sections/all`),
    apiFetch(API.teachers)
  ]);

  fillSelect("teacherDepartment", departments.data, "id", (item) => item.name, "Select Department");
  fillSelect("studentDepartment", departments.data, "id", (item) => item.name, "Select Department");
  fillSelect("studentClass", classes.data, "id", (item) => item.class_name, "Select Class");
  fillSelect("studentSection", sections.data, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("teacherAssignmentTeacher", teachers.data, "id", (item) => item.full_name, "Select Teacher");
}
