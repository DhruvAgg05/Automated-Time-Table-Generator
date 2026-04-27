const classroomModel = require("../models/classroomModel");

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

module.exports = {
  getAllClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getRoomUsage
};
