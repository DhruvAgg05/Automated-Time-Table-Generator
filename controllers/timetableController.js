const adminModel = require("../models/adminModel");
const timetableModel = require("../models/timetableModel");

async function getAllTimetable(req, res, next) {
  try {
    const timetable = await timetableModel.getAllTimetableEntries();
    res.json({ success: true, data: timetable, days: timetableModel.DAYS, slots: timetableModel.SLOT_TIMES });
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
    res.json({ success: true, data, days: timetableModel.DAYS, slots: timetableModel.SLOT_TIMES });
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

module.exports = {
  getAllTimetable,
  generateTimetable,
  updateTimetableEntry,
  deleteTimetableEntry,
  clearTimetable,
  getSectionGrid,
  generateSummaryReport
};
