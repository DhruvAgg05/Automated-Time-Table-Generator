const adminModel = require("../models/adminModel");
const timetableModel = require("../models/timetableModel");

async function getAllTimetable(req, res, next) {
  try {
    const timetable = await timetableModel.getAllTimetableEntries();
    const slots = await timetableModel.getSlotTimings();
    res.json({ success: true, data: timetable, days: timetableModel.DAYS, slots });
  } catch (error) {
    next(error);
  }
}

async function generateTimetable(req, res, next) {
  try {
    const result = await timetableModel.generateTimetable(req.session.user.id);
    res.json({
      success: true,
      message: `Timetable generated successfully with ${result.inserted} scheduled periods.`,
      data: result
    });
  } catch (error) {
    if (error.isGenerationError) {
      return res.status(400).json({
        success: false,
        message: formatGenerationFailure(error.message, error.suggestions || [], error.meta || {})
      });
    }
    next(error);
  }
}

async function updateTimetableEntry(req, res, next) {
  try {
    await timetableModel.updateTimetableEntry(req.params.id, req.body);
    res.json({ success: true, message: "Timetable entry updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteTimetableEntry(req, res, next) {
  try {
    await timetableModel.deleteTimetableEntry(req.params.id);
    res.json({ success: true, message: "Timetable entry deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function clearTimetable(req, res, next) {
  try {
    await timetableModel.clearTimetable();
    res.json({ success: true, message: "Timetable cleared successfully." });
  } catch (error) {
    next(error);
  }
}

async function getSectionGrid(req, res, next) {
  try {
    const data = await timetableModel.getTimetableGrid(req.params.sectionId);
    const slots = await timetableModel.getSlotTimings();
    res.json({ success: true, data, days: timetableModel.DAYS, slots });
  } catch (error) {
    next(error);
  }
}

async function getTeacherGrid(req, res, next) {
  try {
    const data = await timetableModel.getTeacherTimetableGrid(req.query.search || "");
    const slots = await timetableModel.getSlotTimings();
    res.json({ success: true, data, days: timetableModel.DAYS, slots });
  } catch (error) {
    if (error.isGenerationError) {
      return res.status(404).json({ success: false, message: formatGenerationFailure(error.message, error.suggestions || []) });
    }
    next(error);
  }
}

async function getTeacherFreeGrid(req, res, next) {
  try {
    const data = await timetableModel.getTeacherFreeSlotGrid(req.query.search || "");
    const slots = await timetableModel.getSlotTimings();
    res.json({ success: true, data, days: timetableModel.DAYS, slots });
  } catch (error) {
    next(error);
  }
}

async function getSchedulingSupport(req, res, next) {
  try {
    const data = await timetableModel.getSchedulingSupportView(req.query.day, req.query.slot, req.query.search || "");
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function generateSummaryReport(req, res, next) {
  try {
    const [teacherWorkload, roomAllocation, reports] = await Promise.all([
      adminModel.getTeacherWorkload(),
      adminModel.getRoomAllocationReport(),
      adminModel.getReports()
    ]);

    const summary = {
      teacherWorkload,
      roomAllocation,
      recentReports: reports
    };

    await adminModel.saveReport("System Summary Report", "Summary", req.session.user.id, summary);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

async function getSlotTimings(req, res, next) {
  try {
    const slots = await timetableModel.getSlotTimings();
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

async function getTimetableSettings(req, res, next) {
  try {
    const settings = await timetableModel.getTimetableSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

async function updateTimetableSettings(req, res, next) {
  try {
    await timetableModel.updateTimetableSettings({
      lecture_duration_minutes: Number(req.body.lecture_duration_minutes),
      lab_duration_minutes: Number(req.body.lab_duration_minutes)
    });
    res.json({ success: true, message: "Duration settings updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function createSlotTiming(req, res, next) {
  try {
    const id = await timetableModel.createSlotTiming(req.body);
    res.status(201).json({ success: true, message: "Slot timing added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateSlotTiming(req, res, next) {
  try {
    await timetableModel.updateSlotTiming(req.params.id, req.body);
    res.json({ success: true, message: "Slot timing updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteSlotTiming(req, res, next) {
  try {
    await timetableModel.deleteSlotTiming(req.params.id);
    res.json({ success: true, message: "Slot timing removed successfully." });
  } catch (error) {
    next(error);
  }
}

function formatGenerationFailure(message, suggestions, meta = {}) {
  const suggestionHtml = suggestions.length
    ? `<br><strong>Suggestions:</strong><ul class="mb-0">${suggestions.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
  const debugHtml = Array.isArray(meta.debugLog) && meta.debugLog.length
    ? `<br><strong>Debug Details:</strong><ul class="mb-0">${meta.debugLog.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";

  return `<strong>Timetable generation failed:</strong><br>${message}${suggestionHtml}${debugHtml}`;
}

module.exports = {
  getAllTimetable,
  generateTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
  clearTimetable,
  getSectionGrid,
  getTeacherGrid,
  getTeacherFreeGrid,
  getSchedulingSupport,
  generateSummaryReport,
  getSlotTimings,
  createSlotTiming,
  updateSlotTiming,
  deleteSlotTiming,
  getTimetableSettings,
  updateTimetableSettings
};
