const teacherModel = require("../models/teacherModel");

async function getAllTeachers(req, res, next) {
  try {
    const teachers = await teacherModel.getAllTeachers();
    res.json({ success: true, data: teachers });
  } catch (error) {
    next(error);
  }
}

async function createTeacher(req, res, next) {
  try {
    const id = await teacherModel.createTeacher(req.body);
    res.status(201).json({ success: true, message: "Teacher added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateTeacher(req, res, next) {
  try {
    await teacherModel.updateTeacher(req.params.id, req.body);
    res.json({ success: true, message: "Teacher updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteTeacher(req, res, next) {
  try {
    await teacherModel.deleteTeacher(req.params.id);
    res.json({ success: true, message: "Teacher deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getAvailability(req, res, next) {
  try {
    const teacherId = req.params.id || req.session.user.teacher_id;
    const availability = await teacherModel.getTeacherAvailability(teacherId);
    res.json({ success: true, data: availability });
  } catch (error) {
    next(error);
  }
}

async function saveAvailability(req, res, next) {
  try {
    const teacherId = req.params.id;
    await teacherModel.replaceTeacherAvailability(teacherId, req.body.slots || []);
    res.json({ success: true, message: "Availability updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function getTeacherPortal(req, res, next) {
  try {
    const teacherId = req.session.user.teacher_id;
    const schedule = await teacherModel.getTeacherSchedule(teacherId);
    const subjects = await teacherModel.getTeacherAssignedSubjects(teacherId);
    const availability = await teacherModel.getTeacherAvailability(teacherId);
    const freePeriods = [];

    const occupied = new Set(schedule.map((item) => `${item.day_of_week}-${item.slot_number}`));
    for (const slot of availability) {
      if (slot.is_available && !occupied.has(`${slot.day_of_week}-${slot.slot_number}`)) {
        freePeriods.push(slot);
      }
    }

    res.json({
      success: true,
      data: {
        schedule,
        subjects,
        availability,
        freePeriods
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAvailability,
  saveAvailability,
  getTeacherPortal
};
