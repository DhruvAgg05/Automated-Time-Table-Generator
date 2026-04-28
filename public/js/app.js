const API = {
  admin: "/api/admin",
  teachers: "/api/teachers",
  students: "/api/students",
  subjects: "/api/subjects",
  classrooms: "/api/classrooms",
  timetable: "/api/timetable"
};

let SLOT_LABELS = {};

let CURRENT_USER = null;
let CURRENT_PROFILE = null;

window.addEventListener("afterprint", () => {
  clearPrintTargets();
});

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

  if (page === "profile") {
    initProfilePage();
  }
});

async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? (options.headers || {}) : {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    headers,
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

function syncSlotLabels(slots) {
  SLOT_LABELS = {};
  (slots || []).forEach((slot) => {
    SLOT_LABELS[slot.slot_number] = `${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)}`;
  });
}

function getTodayLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 10);
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

function clearPrintTargets() {
  document.querySelectorAll(".print-area").forEach((element) => {
    element.classList.remove("print-target-active");
  });
  delete document.body.dataset.printTarget;
}

function printOnlyTarget(targetId) {
  clearPrintTargets();
  const target = document.getElementById(targetId);
  if (!target) {
    return;
  }

  target.classList.add("print-target-active");
  document.body.dataset.printTarget = targetId;
  window.print();
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
    const timetableMeta = await apiFetch(API.timetable);
    syncSlotLabels(timetableMeta.slots);
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
  const slotResult = await apiFetch(`${API.timetable}/slots`);
  syncSlotLabels(slotResult.data);
  renderAvailabilityGrid(slotResult.data);
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
      for (const slotNumber of Object.keys(SLOT_LABELS).map(Number)) {
        const slot = slotNumber;
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

  document.getElementById("teacherUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = await apiFetch(`${API.teachers}/upload`, {
      method: "POST",
      body: formData
    });
    showMessage("teacherMessage", result.message);
    event.target.reset();
    await loadTeachers();
  });
}

function renderAvailabilityGrid(slots) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  document.getElementById("availabilityGridContainer").innerHTML = `
    <table class="table table-bordered text-center align-middle">
      <thead>
        <tr>
          <th>Day</th>
          ${slots.map((slot) => `<th>Slot ${slot.slot_number}<br><small>${String(slot.start_time).slice(0, 5)}-${String(slot.end_time).slice(0, 5)}</small></th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${days.map((day) => `
          <tr>
            <th>${day}</th>
            ${slots.map((slot) => `<td><input type="checkbox" id="av-${day}-${slot.slot_number}"></td>`).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
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

  document.getElementById("studentUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = await apiFetch(`${API.students}/upload`, {
      method: "POST",
      body: formData
    });
    showMessage("studentMessage", result.message);
    event.target.reset();
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

  document.getElementById("subjectUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = await apiFetch(`${API.subjects}/upload`, {
      method: "POST",
      body: formData
    });
    showMessage("subjectMessage", result.message);
    event.target.reset();
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
        <td>${subject.theory_lectures_per_week}</td>
        <td>${subject.lab_sessions_per_week}</td>
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
    .map((item) => `<li class="list-group-item">${item.class_name} ${item.section_name} -> ${item.subject_name}</li>`)
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

  document.getElementById("classroomUploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const result = await apiFetch(`${API.classrooms}/upload`, {
      method: "POST",
      body: formData
    });
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
  document.getElementById("printTimetableBtn").addEventListener("click", () => {
    if (CURRENT_USER.role === "admin") {
      const hasGrid = document.getElementById("gridContainer").querySelector("table");
      if (!hasGrid) {
        showMessage("timetableMessage", "Select a section first to print the section timetable.", "danger");
        return;
      }
    }
    printOnlyTarget("primaryGridCard");
  });
  document.getElementById("printPrimaryGridBtn").addEventListener("click", () => {
    printOnlyTarget("primaryGridCard");
  });
  const today = getTodayLocal();
  if (document.getElementById("roomFreeDate")) document.getElementById("roomFreeDate").value = today;
  if (document.getElementById("extraLectureDate")) document.getElementById("extraLectureDate").value = today;

  if (CURRENT_USER.role === "admin") {
    document.getElementById("teacherGridPanel").classList.remove("hidden");
    document.getElementById("supportPanel").classList.remove("hidden");
    document.getElementById("roomFreePanel").classList.remove("hidden");
    document.getElementById("adminExtraLecturePanel").classList.remove("hidden");
    document.getElementById("primaryGridCard").classList.remove("hidden");
    document.getElementById("roomFreeGridPanel").classList.remove("hidden");
    document.getElementById("teacherPrintableCard").classList.remove("hidden");
    document.getElementById("teacherFreeVisibilityCard").classList.remove("hidden");
    await populateCommonReferenceSelects();
    await loadTimetablePage();
    await loadSlotTimingSettings();
    await loadDurationSettings();
    await loadTeacherFreeGrid();
    await loadSchedulingSupport();
    await loadRoomFreeGrid();
    await loadAdminExtraLectureRequests();

    document.getElementById("generateTimetableBtn").addEventListener("click", async () => {
      try {
        const result = await apiFetch(`${API.timetable}/generate`, { method: "POST" });
        showMessage("timetableMessage", result.message);
        await loadTimetablePage();
        await loadTeacherFreeGrid();
        await loadSchedulingSupport();
        await loadRoomFreeGrid();
      } catch (error) {
        showMessage("timetableMessage", error.message, "danger");
      }
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
      syncSlotLabels(result.slots);
      const selectedLabel = event.target.options[event.target.selectedIndex]?.textContent || "Selected Section";
      renderSectionTimetableGrid(result.data, selectedLabel);
    });

    document.getElementById("printSectionGridBtn").addEventListener("click", () => {
      const hasGrid = document.getElementById("gridContainer").querySelector("table");
      if (!hasGrid) {
        showMessage("timetableMessage", "Select a section first to print the section timetable.", "danger");
        return;
      }
      printOnlyTarget("primaryGridCard");
    });

    document.getElementById("teacherGridSearchBtn").addEventListener("click", async () => {
      await loadTeacherGrid();
    });

    document.getElementById("printTeacherGridBtn").addEventListener("click", () => {
      const hasGrid = document.getElementById("teacherGridContainer").querySelector("table");
      if (!hasGrid) {
        showMessage("timetableMessage", "Search for a teacher first to print the teacher timetable.", "danger");
        return;
      }
      printOnlyTarget("teacherPrintableCard");
    });

    document.getElementById("freeTeacherSearchBtn").addEventListener("click", async () => {
      await loadTeacherFreeGrid();
    });

    document.getElementById("supportRefreshBtn").addEventListener("click", async () => {
      await loadSchedulingSupport();
    });

    document.getElementById("roomFreeRefreshBtn").addEventListener("click", async () => {
      await loadRoomFreeGrid();
    });

    document.getElementById("adminRequestStatusFilter").addEventListener("change", async () => {
      await loadAdminExtraLectureRequests();
    });

    document.getElementById("slotTimingForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const id = payload.id;
      delete payload.id;
      payload.slot_number = Number(payload.slot_number);
      const url = id ? `${API.timetable}/slots/${id}` : `${API.timetable}/slots`;
      const method = id ? "PUT" : "POST";
      const result = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      showMessage("timetableMessage", result.message);
      event.target.reset();
      await loadSlotTimingSettings();
      await loadTimetablePage();
      await loadSchedulingSupport();
      await loadRoomFreeGrid();
    });

    document.getElementById("durationSettingsForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(event.target).entries());
      payload.lecture_duration_minutes = Number(payload.lecture_duration_minutes);
      payload.lab_duration_minutes = Number(payload.lab_duration_minutes);
      const result = await apiFetch(`${API.timetable}/settings`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showMessage("timetableMessage", result.message);
      await loadDurationSettings();
    });

    return;
  }

  document.getElementById("generateTimetableBtn").classList.add("hidden");
  document.getElementById("clearTimetableBtn").classList.add("hidden");
  document.getElementById("manualOverridePanel").classList.add("hidden");
  document.getElementById("roomFreePanel").classList.add("hidden");
  document.getElementById("adminExtraLecturePanel").classList.add("hidden");
  document.getElementById("teacherGridPanel").classList.add("hidden");
  document.getElementById("supportPanel").classList.add("hidden");
  document.getElementById("primaryGridCard").classList.remove("hidden");
  document.getElementById("teacherPrintableCard").classList.add("hidden");
  document.getElementById("teacherFreeVisibilityCard").classList.add("hidden");
  document.getElementById("supportSummary").innerHTML = "";

  if (CURRENT_USER.role === "teacher") {
    CURRENT_PROFILE = (await apiFetch(`${API.admin}/profile`)).data;
    const timetableMeta = await apiFetch(API.timetable);
    syncSlotLabels(timetableMeta.slots);
    const result = await apiFetch(`${API.teachers}/portal/me`);
    renderPortalTimetableRows(result.data.schedule, "teacher");
    renderTeacherSelfTimetableGrid(result.data.schedule);
    document.getElementById("sectionGridPanel").classList.add("hidden");
    document.getElementById("teacherExtraLecturePanel").classList.remove("hidden");
    document.getElementById("teacherExtraLectureRequestsPanel").classList.remove("hidden");
    document.getElementById("roomFreeGridPanel").classList.remove("hidden");
    await loadTeacherExtraLectureDashboard();
    await loadTeacherExtraLectureRequests();

    document.getElementById("extraLectureDate").addEventListener("change", async () => {
      await loadTeacherExtraLectureDashboard();
      await loadRoomFreeGrid();
    });
    document.getElementById("extraLectureType").addEventListener("change", async (event) => {
      document.getElementById("extraLectureRoomType").value = event.target.value === "Lab" ? "Lab" : "Classroom";
      await loadTeacherExtraLectureDashboard();
      await loadRoomFreeGrid();
    });
    document.getElementById("extraLectureRoomType").addEventListener("change", async () => {
      await loadTeacherExtraLectureDashboard();
      await loadRoomFreeGrid();
    });
    document.getElementById("extraLectureRequestForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const payload = buildTeacherExtraLecturePayload();
        const resultRequest = await apiFetch(`${API.timetable}/extra-lecture/requests`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        showMessage("teacherExtraLectureMessage", resultRequest.message);
        event.target.reset();
        document.getElementById("extraLectureDate").value = today;
        await loadTeacherExtraLectureDashboard();
        await loadTeacherExtraLectureRequests();
        await loadRoomFreeGrid();
      } catch (error) {
        showMessage("teacherExtraLectureMessage", error.message, "danger");
      }
    });
    return;
  }

  CURRENT_PROFILE = (await apiFetch(`${API.admin}/profile`)).data;
  const timetableMeta = await apiFetch(API.timetable);
  syncSlotLabels(timetableMeta.slots);
  const result = await apiFetch(`${API.students}/portal/me`);
  renderPortalTimetableRows(result.data, "student");
  renderStudentTimetableGrid(result.data);
  document.getElementById("sectionGridPanel").classList.add("hidden");
  document.getElementById("roomFreeGridPanel").classList.add("hidden");
  document.getElementById("teacherExtraLecturePanel").classList.add("hidden");
  document.getElementById("teacherExtraLectureRequestsPanel").classList.add("hidden");
  document.getElementById("teacherGridPanel").classList.add("hidden");
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
  syncSlotLabels(timetableResult.slots);

  fillSelect("editClassId", classes, "id", (item) => item.class_name, "Select Class");
  fillSelect("editSectionId", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("editSubjectId", subjects, "id", (item) => `${item.subject_code} - ${item.subject_name}`, "Select Subject");
  fillSelect("editTeacherId", teacherData.data, "id", (item) => item.full_name, "Select Teacher");
  fillSelect("editClassroomId", roomData.data, "id", (item) => item.room_name, "Select Room");
  fillSelect("adminApprovalRoomSelect", roomData.data, "id", (item) => `${item.room_name} (${item.room_type})`, "Auto Assign Room");
  fillSelect("sectionGridSelect", sections, "id", (item) => `${item.class_name} ${item.section_name}`, "Select Section");
  fillSelect("editSlot", timetableResult.slots, "slot_number", (item) => `Slot ${item.slot_number} (${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)})`, "Select Slot");
  fillSelect("supportSlotSelect", timetableResult.slots, "slot_number", (item) => `Slot ${item.slot_number} (${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)})`, "Select Slot");

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

function buildTeacherExtraLecturePayload() {
  const assignmentValue = document.getElementById("extraLectureSubject").value;
  const assignment = JSON.parse(assignmentValue);
  return {
    subject_id: assignment.subject_id,
    class_id: assignment.class_id,
    section_id: assignment.section_id,
    requested_date: document.getElementById("extraLectureDate").value,
    request_type: document.getElementById("extraLectureType").value,
    room_type_needed: document.getElementById("extraLectureRoomType").value,
    room_id: document.getElementById("extraLectureRoomId").value || null,
    slot_number: Number(document.getElementById("extraLectureStartSlot").value),
    end_slot_number: Number(document.getElementById("extraLectureEndSlot").value),
    notes: document.getElementById("extraLectureNotes").value.trim()
  };
}

async function loadRoomFreeGrid() {
  const requestedDate = (CURRENT_USER.role === "teacher"
    ? document.getElementById("extraLectureDate")?.value
    : document.getElementById("roomFreeDate")?.value) || getTodayLocal();
  const roomType = CURRENT_USER.role === "teacher"
    ? (document.getElementById("extraLectureRoomType")?.value || "All")
    : (document.getElementById("roomFreeType")?.value || "All");
  const search = CURRENT_USER.role === "teacher"
    ? ""
    : (document.getElementById("roomFreeSearch")?.value.trim() || "");

  try {
    const result = await apiFetch(
      `${API.timetable}/room-free-grid?requested_date=${encodeURIComponent(requestedDate)}&room_type=${encodeURIComponent(roomType)}&search=${encodeURIComponent(search)}`
    );
    renderRoomFreeGrid(result.data.grid, result.data.selectedDate, result.data.selectedDay, roomType);
    if (document.getElementById("roomFreeSummary")) {
      document.getElementById("roomFreeSummary").innerHTML = `Showing free ${roomType === "All" ? "rooms" : roomType.toLowerCase()} for <strong>${result.data.selectedDay}</strong> (${result.data.selectedDate}).`;
    }
  } catch (error) {
    document.getElementById("roomFreeGridContainer").innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  }
}

async function loadTeacherExtraLectureDashboard() {
  const requestedDate = document.getElementById("extraLectureDate").value || getTodayLocal();
  const roomType = document.getElementById("extraLectureRoomType").value || "Classroom";
  const result = await apiFetch(
    `${API.timetable}/extra-lecture/dashboard?requested_date=${encodeURIComponent(requestedDate)}&room_type=${encodeURIComponent(roomType)}`
  );

  const subjectSelect = document.getElementById("extraLectureSubject");
  subjectSelect.innerHTML = '<option value="">Select Assigned Subject</option>';
  result.data.subjects.forEach((item) => {
    const option = document.createElement("option");
    option.value = JSON.stringify({
      subject_id: item.subject_id,
      class_id: item.class_id,
      section_id: item.section_id
    });
    option.textContent = `${item.subject_code} - ${item.subject_name} (${item.class_name} ${item.section_name})`;
    subjectSelect.appendChild(option);
  });

  fillSelect(
    "extraLectureStartSlot",
    Object.keys(SLOT_LABELS).map((slotNumber) => ({ slot_number: Number(slotNumber) })),
    "slot_number",
    (item) => `Slot ${item.slot_number} (${SLOT_LABELS[item.slot_number]})`,
    "Start Slot"
  );
  fillSelect(
    "extraLectureEndSlot",
    Object.keys(SLOT_LABELS).map((slotNumber) => ({ slot_number: Number(slotNumber) })),
    "slot_number",
    (item) => `Slot ${item.slot_number} (${SLOT_LABELS[item.slot_number]})`,
    "End Slot"
  );

  const rooms = result.data.roomGrid.flatMap((slot) => slot.free_rooms);
  const uniqueRooms = Array.from(new Map(rooms.map((room) => [room.id, room])).values());
  fillSelect("extraLectureRoomId", uniqueRooms, "id", (item) => `${item.room_name} (${item.room_type})`, "Auto Assign or Select Room");

  document.getElementById("teacherOwnFreeSlots").innerHTML = renderListItems(
    result.data.ownFreeSlots.map((slot) => `${SLOT_LABELS[slot.slot_number]}`),
    "No free teacher slots on the selected date."
  );

  document.getElementById("teacherFreeRoomsList").innerHTML = renderListItems(
    result.data.roomGrid.map((slot) => {
      const roomNames = slot.free_rooms.map((room) => room.room_name).join(", ");
      return roomNames ? `${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)}: ${roomNames}` : null;
    }).filter(Boolean),
    "No free rooms found for the selected date."
  );
}

async function loadTeacherExtraLectureRequests() {
  const result = await apiFetch(`${API.timetable}/extra-lecture/requests`);
  document.getElementById("teacherExtraLectureRows").innerHTML = result.data
    .map((item) => `<tr>
      <td>${item.subject_code} - ${item.subject_name}<br><small>${item.class_name} ${item.section_name}</small></td>
      <td>${item.requested_date}<br><small>${item.requested_day}</small></td>
      <td>${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}</td>
      <td>${item.room_name || item.room_type_needed}</td>
      <td>${item.status}</td>
      <td>${item.notification_message || "-"}</td>
      <td>
        ${["Pending", "Approved", "Needs Reschedule"].includes(item.status) ? `<button class="btn btn-sm btn-outline-danger" onclick="cancelExtraLectureRequest(${item.request_id})">Cancel</button>` : ""}
        ${item.notification_message && !item.notification_seen ? `<button class="btn btn-sm btn-outline-secondary mt-1" onclick="markExtraLectureSeen(${item.request_id})">Acknowledge</button>` : ""}
      </td>
    </tr>`)
    .join("");
}

async function loadAdminExtraLectureRequests() {
  const status = document.getElementById("adminRequestStatusFilter").value;
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const result = await apiFetch(`${API.timetable}/extra-lecture/requests${query}`);
  document.getElementById("adminExtraLectureRows").innerHTML = result.data
    .map((item) => `<tr>
      <td>${item.teacher_code} - ${item.teacher_name}</td>
      <td>${item.subject_code} - ${item.subject_name}<br><small>${item.class_name} ${item.section_name}</small></td>
      <td>${item.requested_date}<br><small>${item.requested_day}</small></td>
      <td>${String(item.start_time).slice(0, 5)} - ${String(item.end_time).slice(0, 5)}</td>
      <td>${item.room_type_needed}</td>
      <td>${item.room_name || "-"}</td>
      <td>${item.status}${item.notification_message ? `<br><small>${item.notification_message}</small>` : ""}</td>
      <td>
        ${["Pending", "Needs Reschedule"].includes(item.status) ? `<button class="btn btn-sm btn-outline-success" onclick="approveExtraLectureRequest(${item.request_id})">Approve</button>
        <button class="btn btn-sm btn-outline-danger mt-1" onclick="rejectExtraLectureRequest(${item.request_id})">Reject</button>` : ""}
        ${["Pending", "Approved", "Needs Reschedule"].includes(item.status) ? `<button class="btn btn-sm btn-outline-secondary mt-1" onclick="cancelExtraLectureRequest(${item.request_id})">Cancel</button>` : ""}
      </td>
    </tr>`)
    .join("");
}

async function loadSlotTimingSettings() {
  const result = await apiFetch(`${API.timetable}/slots`);
  syncSlotLabels(result.data);
  document.getElementById("slotTimingRows").innerHTML = result.data
    .map(
      (slot) => `<tr>
        <td>${slot.slot_number}</td>
        <td>${String(slot.start_time).slice(0, 5)}</td>
        <td>${String(slot.end_time).slice(0, 5)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick='editSlotTiming(${JSON.stringify(slot)})'>Edit</button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteSlotTiming(${slot.id})">Delete</button>
        </td>
      </tr>`
    )
    .join("");
}

async function loadDurationSettings() {
  const result = await apiFetch(`${API.timetable}/settings`);
  document.getElementById("lectureDurationMinutes").value = result.data.lecture_duration_minutes;
  document.getElementById("labDurationMinutes").value = result.data.lab_duration_minutes;
}

async function loadTeacherGrid() {
  const search = document.getElementById("teacherSearchInput").value.trim();
  if (!search) {
    document.getElementById("teacherGridContainer").innerHTML = '<p class="text-muted mb-0">Enter a teacher name or code to view the weekly grid.</p>';
    document.getElementById("teacherGridSummary").innerHTML = "";
    document.getElementById("teacherGridPrintMeta").innerHTML = "";
    return;
  }

  try {
    const result = await apiFetch(`${API.timetable}/teacher-grid?search=${encodeURIComponent(search)}`);
    syncSlotLabels(result.slots);
    renderTeacherTimetableGrid(result.data.entries);
    document.getElementById("teacherGridSummary").innerHTML = `
      <strong>${result.data.teacher.teacher_code} - ${result.data.teacher.full_name}</strong><br>
      Assigned Periods: ${result.data.summary.assigned_periods} |
      Free Periods: ${result.data.summary.free_periods} |
      Available Periods: ${result.data.summary.available_periods} |
      Unavailable Periods: ${result.data.summary.unavailable_periods}
    `;
    document.getElementById("teacherGridPrintMeta").innerHTML = `
      <strong>Automated Time Table Management System</strong><br>
      Teacher Timetable: ${result.data.teacher.teacher_code} - ${result.data.teacher.full_name}<br>
      Assigned Periods: ${result.data.summary.assigned_periods} | Free Periods: ${result.data.summary.free_periods}
    `;
  } catch (error) {
    document.getElementById("teacherGridContainer").innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
    document.getElementById("teacherGridSummary").innerHTML = "";
    document.getElementById("teacherGridPrintMeta").innerHTML = "";
  }
}

async function loadTeacherFreeGrid() {
  const search = document.getElementById("freeTeacherSearchInput").value.trim();
  try {
    const result = await apiFetch(`${API.timetable}/teacher-free-grid?search=${encodeURIComponent(search)}`);
    renderFreeTeacherGrid(result.data.grid, result.data.totalTeachers);
  } catch (error) {
    document.getElementById("freeTeacherGridContainer").innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  }
}

async function loadSchedulingSupport() {
  const day = document.getElementById("supportDaySelect").value;
  const slot = document.getElementById("supportSlotSelect").value;
  const search = document.getElementById("supportTeacherSearch").value.trim();
  if (!slot) {
    return;
  }

  try {
    const result = await apiFetch(
      `${API.timetable}/support?day=${encodeURIComponent(day)}&slot=${encodeURIComponent(slot)}&search=${encodeURIComponent(search)}`
    );

    document.getElementById("supportSummary").innerHTML = `
      <div class="mb-3 mini-note">
        Showing scheduling support for <strong>${result.data.selectedDay}</strong>,
        <strong>${String(result.data.selectedSlot.start_time).slice(0, 5)} - ${String(result.data.selectedSlot.end_time).slice(0, 5)}</strong>.
      </div>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="border rounded-3 p-3 h-100">
            <h6>Free Teachers (${result.data.freeTeachers.length})</h6>
            <ul class="list-group list-group-flush">${renderListItems(result.data.freeTeachers.map((teacher) => `${teacher.teacher_code} - ${teacher.full_name}`), "No free teachers found.")}</ul>
          </div>
        </div>
        <div class="col-md-4">
          <div class="border rounded-3 p-3 h-100">
            <h6>Free Classrooms (${result.data.freeClassrooms.length})</h6>
            <ul class="list-group list-group-flush">${renderListItems(result.data.freeClassrooms.map((room) => `${room.room_name} (${room.capacity})`), "No free classrooms found.")}</ul>
          </div>
        </div>
        <div class="col-md-4">
          <div class="border rounded-3 p-3 h-100">
            <h6>Free Labs (${result.data.freeLabs.length})</h6>
            <ul class="list-group list-group-flush">${renderListItems(result.data.freeLabs.map((room) => `${room.room_name} (${room.capacity})`), "No free labs found.")}</ul>
          </div>
        </div>
        <div class="col-12">
          <div class="border rounded-3 p-3">
            <h6>Near Overload Teachers (${result.data.overloadedTeachers.length})</h6>
            <ul class="list-group list-group-flush">${renderListItems(result.data.overloadedTeachers.map((teacher) => `${teacher.teacher_code} - ${teacher.full_name} (${teacher.assigned_periods}/${teacher.weekly_capacity} periods)`), "No overloaded teachers right now.")}</ul>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    document.getElementById("supportSummary").innerHTML = `<div class="alert alert-danger mb-0">${error.message}</div>`;
  }
}

function renderListItems(items, emptyMessage) {
  if (!items.length) {
    return `<li class="list-group-item">${emptyMessage}</li>`;
  }

  return items.map((item) => `<li class="list-group-item">${item}</li>`).join("");
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

window.editSlotTiming = function editSlotTiming(slot) {
  document.getElementById("slotTimingId").value = slot.id;
  document.getElementById("slotNumber").value = slot.slot_number;
  document.getElementById("slotStartTime").value = String(slot.start_time).slice(0, 5);
  document.getElementById("slotEndTime").value = String(slot.end_time).slice(0, 5);
};

window.deleteSlotTiming = async function deleteSlotTiming(id) {
  if (!window.confirm("Delete this slot timing?")) return;
  const result = await apiFetch(`${API.timetable}/slots/${id}`, { method: "DELETE" });
  showMessage("timetableMessage", result.message);
  document.getElementById("slotTimingForm").reset();
  await loadSlotTimingSettings();
  await loadTimetablePage();
};

window.deleteTimetableEntry = async function deleteTimetableEntry(id) {
  if (!window.confirm("Delete this timetable entry?")) return;
  const result = await apiFetch(`${API.timetable}/${id}`, { method: "DELETE" });
  showMessage("timetableMessage", result.message);
  await loadTimetablePage();
};

window.approveExtraLectureRequest = async function approveExtraLectureRequest(id) {
  try {
    const result = await apiFetch(`${API.timetable}/extra-lecture/requests/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({
        room_id: document.getElementById("adminApprovalRoomSelect").value || null,
        admin_notes: document.getElementById("adminApprovalNotes").value.trim()
      })
    });
    showMessage("timetableMessage", result.message);
    await loadAdminExtraLectureRequests();
    await loadRoomFreeGrid();
  } catch (error) {
    showMessage("timetableMessage", error.message, "danger");
  }
};

window.rejectExtraLectureRequest = async function rejectExtraLectureRequest(id) {
  try {
    const result = await apiFetch(`${API.timetable}/extra-lecture/requests/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({
        admin_notes: document.getElementById("adminApprovalNotes").value.trim()
      })
    });
    showMessage("timetableMessage", result.message);
    await loadAdminExtraLectureRequests();
  } catch (error) {
    showMessage("timetableMessage", error.message, "danger");
  }
};

window.cancelExtraLectureRequest = async function cancelExtraLectureRequest(id) {
  try {
    const result = await apiFetch(`${API.timetable}/extra-lecture/requests/${id}/cancel`, {
      method: "PUT"
    });
    showMessage(CURRENT_USER.role === "teacher" ? "teacherExtraLectureMessage" : "timetableMessage", result.message);
    if (CURRENT_USER.role === "teacher") {
      await loadTeacherExtraLectureRequests();
      await loadTeacherExtraLectureDashboard();
    } else {
      await loadAdminExtraLectureRequests();
    }
    await loadRoomFreeGrid();
  } catch (error) {
    showMessage(CURRENT_USER.role === "teacher" ? "teacherExtraLectureMessage" : "timetableMessage", error.message, "danger");
  }
};

window.markExtraLectureSeen = async function markExtraLectureSeen(id) {
  await apiFetch(`${API.timetable}/extra-lecture/requests/${id}/seen`, { method: "PUT" });
  await loadTeacherExtraLectureRequests();
};

function renderWeeklyGrid(entries, renderer) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const slots = Object.keys(SLOT_LABELS)
    .map(Number)
    .sort((a, b) => a - b);

  const html = `<table class="table table-bordered timetable-grid">
    <thead>
      <tr>
        <th>Day / Slot</th>
        ${slots.map((slot) => `<th>${SLOT_LABELS[slot]}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${days
        .map(
          (day) => `<tr>
            <th>${day}</th>
            ${slots
              .map((slot) => {
                const match = entries.find((item) => item.day_of_week === day && Number(item.slot_number) === slot);
                return `<td>${match ? renderer(match) : `<div class="grid-free">Free</div>`}</td>`;
              })
              .join("")}
          </tr>`
        )
        .join("")}
    </tbody>
  </table>`;

  return html;
}

function renderSectionTimetableGrid(entries, sectionLabel = "Selected Section") {
  document.getElementById("primaryGridTitle").textContent = "Section Weekly Timetable";
  document.getElementById("primaryGridMeta").innerHTML = `
    <strong>Automated Time Table Management System</strong><br>
    Section: ${sectionLabel}<br>
    Weekly timetable grid
  `;
  document.getElementById("gridContainer").innerHTML = renderWeeklyGrid(
    entries,
    (entry) => `<div class="grid-cell"><div class="grid-title">${entry.subject_name}</div><div class="grid-meta">${entry.teacher_name || "-"}</div><div class="grid-meta">${entry.room_name || "-"}</div></div>`
  );
}

function renderStudentTimetableGrid(entries) {
  document.getElementById("primaryGridTitle").textContent = "Student Weekly Timetable";
  document.getElementById("primaryGridMeta").innerHTML = `
    <strong>Automated Time Table Management System</strong><br>
    Student: ${CURRENT_PROFILE?.full_name || CURRENT_USER.name}<br>
    Department: ${CURRENT_PROFILE?.department_name || "-"} | Class / Section: ${CURRENT_PROFILE?.class_name || "-"} ${CURRENT_PROFILE?.section_name || ""}
  `;
  document.getElementById("gridContainer").innerHTML = renderWeeklyGrid(
    entries,
    (entry) => `<div class="grid-cell"><div class="grid-title">${entry.subject_name}</div><div class="grid-meta">${entry.teacher_name || "-"}</div><div class="grid-meta">${entry.room_name || "-"}</div></div>`
  );
}

function renderTeacherSelfTimetableGrid(entries) {
  document.getElementById("primaryGridTitle").textContent = "Teacher Weekly Timetable";
  document.getElementById("primaryGridMeta").innerHTML = `
    <strong>Automated Time Table Management System</strong><br>
    Teacher: ${CURRENT_PROFILE?.teacher_code ? `${CURRENT_PROFILE.teacher_code} - ` : ""}${CURRENT_PROFILE?.full_name || CURRENT_USER.name}<br>
    Department: ${CURRENT_PROFILE?.department_name || "-"}
  `;
  document.getElementById("gridContainer").innerHTML = renderWeeklyGrid(
    entries,
    (entry) => `<div class="grid-cell"><div class="grid-title">${entry.subject_name}</div><div class="grid-meta">${entry.class_name} ${entry.section_name}</div><div class="grid-meta">${entry.room_name || "-"}</div></div>`
  );
}

function renderTeacherTimetableGrid(entries) {
  document.getElementById("teacherGridContainer").innerHTML = renderWeeklyGrid(
    entries,
    (entry) => `<div class="grid-cell"><div class="grid-title">${entry.subject_name}</div><div class="grid-meta">${entry.class_name} ${entry.section_name}</div><div class="grid-meta">${entry.room_name || "-"}</div></div>`
  );
}

function renderFreeTeacherGrid(grid, totalTeachers = 0) {
  const slots = Object.keys(SLOT_LABELS)
    .map(Number)
    .sort((a, b) => a - b);

  const html = `
    <div class="mini-note mb-3">Showing free teachers from ${totalTeachers} teacher records across all configured days and slots.</div>
    <table class="table table-bordered timetable-grid">
    <thead>
      <tr>
        <th>Time / Day</th>
        ${grid.map((day) => `<th>${day.day}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${slots
        .map((slotNumber) => `<tr>
          <th>${SLOT_LABELS[slotNumber]}</th>
          ${grid.map((day) => {
            const slot = day.slots.find((entry) => Number(entry.slot_number) === slotNumber);
            const teachers = slot?.free_teachers || [];
            return `<td>${teachers.length ? `<div class="grid-cell">${teachers.map((teacher) => `<div>${teacher.teacher_code} ${teacher.full_name}</div>`).join("")}</div>` : "-"}</td>`;
          }).join("")}
        </tr>`).join("")}
    </tbody>
  </table>`;

  document.getElementById("freeTeacherGridContainer").innerHTML = html;
}

function renderRoomFreeGrid(grid, selectedDate, selectedDay, roomType) {
  const html = `
    <div class="mini-note mb-3">Free ${roomType === "All" ? "rooms" : roomType.toLowerCase()} for <strong>${selectedDay}</strong> (${selectedDate}).</div>
    <table class="table table-bordered timetable-grid">
      <thead>
        <tr>
          <th>Time Slot</th>
          <th>Free Rooms</th>
        </tr>
      </thead>
      <tbody>
        ${grid.map((slot) => `<tr>
          <th>${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)}</th>
          <td>${slot.free_rooms.length ? `<div class="grid-cell">${slot.free_rooms.map((room) => `<div>${room.room_name} (${room.room_type})</div>`).join("")}</div>` : "-"}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("roomFreeGridContainer").innerHTML = html;
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

async function initProfilePage() {
  await loadProfilePage();

  document.getElementById("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const result = await apiFetch(`${API.admin}/profile`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showMessage("profileMessage", result.message);
      if (result.data?.full_name) {
        document.getElementById("currentUserName").textContent = result.data.full_name;
      }
      populateProfileForm(result.data);
      populateProfileSummary(result.data);
    } catch (error) {
      showMessage("profileMessage", error.message, "danger");
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = Object.fromEntries(new FormData(event.target).entries());
      const result = await apiFetch(`${API.admin}/profile/password`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showMessage("profileMessage", result.message);
      event.target.reset();
    } catch (error) {
      showMessage("profileMessage", error.message, "danger");
    }
  });

  const resetButton = document.getElementById("managedUserResetBtn");
  if (resetButton) {
    resetButton.addEventListener("click", async () => {
      const userId = document.getElementById("managedUserSelect").value;
      const newPassword = document.getElementById("managedUserNewPassword").value.trim();
      if (!userId || !newPassword) {
        showMessage("profileMessage", "Select a user and enter a new password.", "danger");
        return;
      }

      try {
        const result = await apiFetch(`${API.admin}/managed-users/password`, {
          method: "PUT",
          body: JSON.stringify({
            user_id: Number(userId),
            new_password: newPassword
          })
        });
        showMessage("profileMessage", result.message);
        document.getElementById("managedUserNewPassword").value = "";
        await loadProfilePage();
      } catch (error) {
        showMessage("profileMessage", error.message, "danger");
      }
    });
  }
}

async function loadProfilePage() {
  const result = await apiFetch(`${API.admin}/profile`);
  populateProfileForm(result.data);
  populateProfileSummary(result.data);

  if (CURRENT_USER.role === "admin") {
    document.getElementById("managedUsersPanel").classList.remove("hidden");
    populateManagedUsers(result.managedUsers || { teachers: [], students: [] });
  } else {
    document.getElementById("managedUsersPanel").classList.add("hidden");
  }
}

function populateProfileForm(profile) {
  document.getElementById("profileRole").value = (profile.role || CURRENT_USER.role || "").toUpperCase();
  document.getElementById("profileUsername").value = profile.username || CURRENT_USER.username || "";
  document.getElementById("profileFullName").value = profile.full_name || "";
  document.getElementById("profileEmail").value = profile.email || "";
  document.getElementById("profilePhone").value = profile.phone || "";
  document.getElementById("profileDepartment").value = profile.department_name || "-";

  const teacherCodeWrap = document.getElementById("profileTeacherCodeWrap");
  const rollNumberWrap = document.getElementById("profileRollNumberWrap");
  const teacherCodeInput = document.getElementById("profileTeacherCode");
  const rollNumberInput = document.getElementById("profileRollNumber");

  teacherCodeInput.value = profile.teacher_code || "";
  rollNumberInput.value = profile.roll_number || "";

  if (CURRENT_USER.role === "teacher") {
    teacherCodeWrap.classList.remove("hidden");
    rollNumberWrap.classList.add("hidden");
    rollNumberInput.value = "";
  } else if (CURRENT_USER.role === "student") {
    teacherCodeWrap.classList.add("hidden");
    teacherCodeInput.value = "";
    rollNumberWrap.classList.remove("hidden");
  } else {
    teacherCodeWrap.classList.add("hidden");
    rollNumberWrap.classList.add("hidden");
    teacherCodeInput.value = "";
    rollNumberInput.value = "";
  }
}

function populateProfileSummary(profile) {
  const summaryItems = [
    `Full Name: ${profile.full_name || "-"}`,
    `Username: ${profile.username || CURRENT_USER.username || "-"}`,
    `Email: ${profile.email || "-"}`,
    `Phone: ${profile.phone || "-"}`,
    `Role: ${(profile.role || CURRENT_USER.role || "-").toUpperCase()}`,
    `Department: ${profile.department_name || "-"}`
  ];

  if (profile.teacher_code) {
    summaryItems.push(`Teacher Code: ${profile.teacher_code}`);
  }

  if (profile.roll_number) {
    summaryItems.push(`Student Roll No: ${profile.roll_number}`);
  }

  if (profile.class_name && profile.section_name) {
    summaryItems.push(`Class / Section: ${profile.class_name} ${profile.section_name}`);
  }

  document.getElementById("profileSummaryList").innerHTML = summaryItems
    .map((item) => `<li class="list-group-item">${item}</li>`)
    .join("");
}

function populateManagedUsers(managedUsers) {
  const users = [...(managedUsers.teachers || []), ...(managedUsers.students || [])];
  fillSelect(
    "managedUserSelect",
    users,
    "user_id",
    (item) => `${item.role.toUpperCase()} - ${item.full_name} (${item.username})`,
    "Select User"
  );

  document.getElementById("managedUsersRows").innerHTML = users
    .map((item) => `<tr>
      <td>${item.role}</td>
      <td>${item.full_name}</td>
      <td>${item.username}</td>
      <td>${item.code_or_roll || "-"}</td>
      <td>${item.email || "-"}</td>
      <td>${item.phone || "-"}</td>
      <td>${item.department_name || "-"}</td>
    </tr>`)
    .join("");
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
