const pool = require("../config/db");

async function getAllClassrooms() {
  const [rows] = await pool.query("SELECT * FROM classrooms ORDER BY room_name");
  return rows;
}

async function getClassroomById(id) {
  const [rows] = await pool.query("SELECT * FROM classrooms WHERE id = ?", [id]);
  return rows[0];
}

async function createClassroom(data) {
  const [result] = await pool.query(
    "INSERT INTO classrooms (room_name, room_type, capacity, building) VALUES (?, ?, ?, ?)",
    [data.room_name, data.room_type, data.capacity, data.building || null]
  );

  return result.insertId;
}

async function updateClassroom(id, data) {
  await pool.query(
    "UPDATE classrooms SET room_name = ?, room_type = ?, capacity = ?, building = ? WHERE id = ?",
    [data.room_name, data.room_type, data.capacity, data.building || null, id]
  );
}

async function deleteClassroom(id) {
  await pool.query("DELETE FROM classrooms WHERE id = ?", [id]);
}

async function getRoomUsage() {
  const [rows] = await pool.query(
    `SELECT c.room_name, c.room_type, c.capacity, c.building,
            COUNT(t.id) AS total_allocations
     FROM classrooms c
     LEFT JOIN timetable t ON t.classroom_id = c.id
     GROUP BY c.id, c.room_name, c.room_type, c.capacity, c.building
     ORDER BY total_allocations DESC, c.room_name`
  );

  return rows;
}

module.exports = {
  getAllClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  getRoomUsage
};
