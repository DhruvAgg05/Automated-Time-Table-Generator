const subjectModel = require("../models/subjectModel");
const { parseSheet } = require("../middleware/excelHelper");

async function getReferenceData(req, res, next) {
  try {
    const [departments, classes, sections, subjects, classAssignments, teacherAssignments] = await Promise.all([
      subjectModel.getDepartments(),
      subjectModel.getClasses(),
      subjectModel.getSections(),
      subjectModel.getAllSubjects(),
      subjectModel.getClassSubjectAssignments(),
      subjectModel.getTeacherSubjectAssignments()
    ]);

    res.json({
      success: true,
      data: { departments, classes, sections, subjects, classAssignments, teacherAssignments }
    });
  } catch (error) {
    next(error);
  }
}

async function getAllSubjects(req, res, next) {
  try {
    const subjects = await subjectModel.getAllSubjects();
    res.json({ success: true, data: subjects });
  } catch (error) {
    next(error);
  }
}

async function createSubject(req, res, next) {
  try {
    const validation = validateSubjectPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    const id = await subjectModel.createSubject(req.body);
    res.status(201).json({ success: true, message: "Subject added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateSubject(req, res, next) {
  try {
    const validation = validateSubjectPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    await subjectModel.updateSubject(req.params.id, req.body);
    res.json({ success: true, message: "Subject updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteSubject(req, res, next) {
  try {
    await subjectModel.deleteSubject(req.params.id);
    res.json({ success: true, message: "Subject deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getDepartments(req, res, next) {
  try {
    const departments = await subjectModel.getDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
}

async function createDepartment(req, res, next) {
  try {
    const id = await subjectModel.createDepartment(req.body);
    res.status(201).json({ success: true, message: "Department added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateDepartment(req, res, next) {
  try {
    await subjectModel.updateDepartment(req.params.id, req.body);
    res.json({ success: true, message: "Department updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    await subjectModel.deleteDepartment(req.params.id);
    res.json({ success: true, message: "Department deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getClasses(req, res, next) {
  try {
    const classes = await subjectModel.getClasses();
    res.json({ success: true, data: classes });
  } catch (error) {
    next(error);
  }
}

async function createClass(req, res, next) {
  try {
    const id = await subjectModel.createClass(req.body);
    res.status(201).json({ success: true, message: "Class added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateClass(req, res, next) {
  try {
    await subjectModel.updateClass(req.params.id, req.body);
    res.json({ success: true, message: "Class updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteClass(req, res, next) {
  try {
    await subjectModel.deleteClass(req.params.id);
    res.json({ success: true, message: "Class deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getSections(req, res, next) {
  try {
    const sections = await subjectModel.getSections();
    res.json({ success: true, data: sections });
  } catch (error) {
    next(error);
  }
}

async function createSection(req, res, next) {
  try {
    const id = await subjectModel.createSection(req.body);
    res.status(201).json({ success: true, message: "Section added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateSection(req, res, next) {
  try {
    await subjectModel.updateSection(req.params.id, req.body);
    res.json({ success: true, message: "Section updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteSection(req, res, next) {
  try {
    await subjectModel.deleteSection(req.params.id);
    res.json({ success: true, message: "Section deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function saveClassSubjectAssignment(req, res, next) {
  try {
    await subjectModel.saveClassSubjectAssignment(req.body);
    res.json({ success: true, message: "Class subject assignment saved successfully." });
  } catch (error) {
    next(error);
  }
}

async function saveTeacherSubjectAssignment(req, res, next) {
  try {
    await subjectModel.saveTeacherSubjectAssignment(req.body);
    res.json({ success: true, message: "Teacher subject assignment saved successfully." });
  } catch (error) {
    next(error);
  }
}

async function uploadSubjects(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a .xlsx or .csv file." });
    }

    const rows = parseSheet(req.file.buffer, req.file.originalname);
    const subjects = rows.map((row) => ({
      subject_code: row.subject_code,
      subject_name: row.subject_name,
      department_id: Number(row.department_id),
      semester: Number(row.semester),
      subject_type: row.subject_type || "Theory Only",
      credits: Number(row.credits || row.subject_credits || 3),
      theory_lectures_per_week: Number(row.theory_lectures_per_week || row.number_of_theory_lectures_per_week || 0),
      lab_sessions_per_week: Number(row.lab_sessions_per_week || row.number_of_lab_sessions_per_week || 0)
    })).filter((row) => row.subject_code && row.subject_name && row.department_id && row.semester);

    const result = await subjectModel.bulkCreateSubjects(subjects);
    res.json({
      success: true,
      message: `Subject upload completed. Added: ${result.inserted}, Skipped duplicates: ${result.skipped}, Errors: ${result.errors.length}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

function downloadSubjectTemplate(req, res) {
  const csv = "subject_code,subject_name,department_id,semester,subject_type,theory_lectures_per_week,lab_sessions_per_week,credits\nCS999,Sample Subject,1,3,Both Theory + Lab,3,1,4";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=subjects-template.csv");
  res.send(csv);
}

function validateSubjectPayload(payload) {
  const type = payload.subject_type;
  const theory = Number(payload.theory_lectures_per_week || 0);
  const lab = Number(payload.lab_sessions_per_week || 0);

  if (type === "Theory Only" && theory <= 0) {
    return { valid: false, message: "Theory Only subject must have at least one theory lecture." };
  }

  if (type === "Lab Only" && lab <= 0) {
    return { valid: false, message: "Lab Only subject must have at least one lab session." };
  }

  if (type === "Both Theory + Lab" && (theory <= 0 || lab <= 0)) {
    return { valid: false, message: "Both Theory + Lab subject must include theory lectures and lab sessions." };
  }

  return { valid: true };
}

module.exports = {
  getReferenceData,
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSections,
  createSection,
  updateSection,
  deleteSection,
  saveClassSubjectAssignment,
  saveTeacherSubjectAssignment,
  uploadSubjects,
  downloadSubjectTemplate
};
