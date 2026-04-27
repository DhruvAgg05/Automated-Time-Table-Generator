const subjectModel = require("../models/subjectModel");

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
    const id = await subjectModel.createSubject(req.body);
    res.status(201).json({ success: true, message: "Subject added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateSubject(req, res, next) {
  try {
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
  saveTeacherSubjectAssignment
};
