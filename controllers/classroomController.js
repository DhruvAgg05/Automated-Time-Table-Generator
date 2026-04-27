const classroomModel = require("../models/classroomModel");
const { parseSheet } = require("../middleware/excelHelper");

async function getAllClassrooms(req, res, next) {
  try {
    const rooms = await classroomModel.getAllClassrooms();
    res.json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
}

async function createClassroom(req, res, next) {
  try {
    const id = await classroomModel.createClassroom(req.body);
    res.status(201).json({ success: true, message: "Room added successfully.", id });
  } catch (error) {
    next(error);
  }
}

async function updateClassroom(req, res, next) {
  try {
    await classroomModel.updateClassroom(req.params.id, req.body);
    res.json({ success: true, message: "Room updated successfully." });
  } catch (error) {
    next(error);
  }
}

async function deleteClassroom(req, res, next) {
  try {
    await classroomModel.deleteClassroom(req.params.id);
    res.json({ success: true, message: "Room deleted successfully." });
  } catch (error) {
    next(error);
  }
}

async function getRoomUsage(req, res, next) {
  try {
    const usage = await classroomModel.getRoomUsage();
    res.json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
}

async function uploadClassrooms(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a .xlsx or .csv file." });
    }

    const rows = parseSheet(req.file.buffer, req.file.originalname);
    const classrooms = rows.map((row) => ({
      room_name: row.room_name,
      room_type: row.room_type || "Classroom",
      capacity: Number(row.capacity),
      building: row.building
    })).filter((row) => row.room_name && row.capacity);

    const result = await classroomModel.bulkCreateClassrooms(classrooms);
    res.json({
      success: true,
      message: `Classroom upload completed. Added: ${result.inserted}, Skipped duplicates: ${result.skipped}, Errors: ${result.errors.length}.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

function downloadClassroomTemplate(req, res) {
  const csv = "room_name,room_type,capacity,building\nRoom 500,Classroom,60,Main Block";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=classrooms-template.csv");
  res.send(csv);
}

module.exports = {
  getAllClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getRoomUsage,
  uploadClassrooms,
  downloadClassroomTemplate
};
