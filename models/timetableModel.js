const pool = require("../config/db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_TIMES = {
  1: { start: "09:00:00", end: "10:00:00" },
  2: { start: "10:00:00", end: "11:00:00" },
  3: { start: "11:15:00", end: "12:15:00" },
  4: { start: "13:00:00", end: "14:00:00" },
  5: { start: "14:00:00", end: "15:00:00" },
  6: { start: "15:15:00", end: "16:15:00" }
};

async function getAllTimetableEntries() {
  const [rows] = await pool.query(
    `SELECT tt.id, tt.class_id, tt.section_id, tt.subject_id, tt.teacher_id, tt.classroom_id,
            tt.day_of_week, tt.slot_number, tt.start_time, tt.end_time, tt.is_manual_override,
            c.class_name, sec.section_name,
            s.subject_name, s.subject_type,
            t.full_name AS teacher_name,
            cr.room_name
     FROM timetable tt
     JOIN classes c ON tt.class_id = c.id
     JOIN sections sec ON tt.section_id = sec.id
     JOIN subjects s ON tt.subject_id = s.id
     JOIN teachers t ON tt.teacher_id = t.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     ORDER BY c.class_name, sec.section_name,
              FIELD(tt.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
              tt.slot_number`
  );

  return rows;
}

async function updateTimetableEntry(id, data) {
  await pool.query(
    `UPDATE timetable
     SET class_id = ?, section_id = ?, subject_id = ?, teacher_id = ?, classroom_id = ?, day_of_week = ?, slot_number = ?,
         start_time = ?, end_time = ?, is_manual_override = 1
     WHERE id = ?`,
    [
      data.class_id,
      data.section_id,
      data.subject_id,
      data.teacher_id,
      data.classroom_id,
      data.day_of_week,
      data.slot_number,
      data.start_time,
      data.end_time,
      id
    ]
  );
}

async function deleteTimetableEntry(id) {
  await pool.query("DELETE FROM timetable WHERE id = ?", [id]);
}

async function clearTimetable() {
  await pool.query("DELETE FROM timetable");
}

async function getGenerationData() {
  const [sections] = await pool.query(
    `SELECT sec.id AS section_id, sec.section_name, sec.strength, c.id AS class_id, c.class_name
     FROM sections sec
     JOIN classes c ON sec.class_id = c.id
     ORDER BY c.class_name, sec.section_name`
  );

  const [classSubjects] = await pool.query(
    `SELECT cs.class_id, cs.section_id, cs.subject_id, cs.required_lectures,
            s.subject_name, s.subject_type,
            t.id AS teacher_id, t.full_name AS teacher_name
     FROM class_subjects cs
     JOIN subjects s ON cs.subject_id = s.id
     JOIN teacher_subjects ts
       ON ts.subject_id = cs.subject_id AND ts.class_id = cs.class_id AND ts.section_id = cs.section_id
     JOIN teachers t ON ts.teacher_id = t.id
     ORDER BY cs.section_id, s.subject_type DESC, cs.required_lectures DESC`
  );

  const [classrooms] = await pool.query("SELECT * FROM classrooms ORDER BY capacity");
  const [availability] = await pool.query(
    "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability"
  );
  const [existing] = await pool.query("SELECT teacher_id, classroom_id, section_id, day_of_week, slot_number FROM timetable");

  return { sections, classSubjects, classrooms, availability, existing };
}

function availabilityMap(rows) {
  const map = new Map();

  for (const row of rows) {
    map.set(`${row.teacher_id}-${row.day_of_week}-${row.slot_number}`, row.is_available === 1);
  }

  return map;
}

function existingSet(rows, field) {
  const set = new Set();
  for (const row of rows) {
    set.add(`${row[field]}-${row.day_of_week}-${row.slot_number}`);
  }
  return set;
}

function chooseRoom(classrooms, subjectType, strength, roomBusySet, day, slot) {
  const preferredType = subjectType === "Lab" ? "Lab" : "Classroom";

  const matching = classrooms.filter((room) => room.room_type === preferredType && room.capacity >= strength);
  const fallback = classrooms.filter((room) => room.capacity >= strength);
  const candidates = matching.length ? matching : fallback;

  return candidates.find((room) => !roomBusySet.has(`${room.id}-${day}-${slot}`));
}

async function generateTimetable(adminId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM timetable");

    const [sections] = await connection.query(
      `SELECT sec.id AS section_id, sec.section_name, sec.strength, c.id AS class_id, c.class_name
       FROM sections sec
       JOIN classes c ON sec.class_id = c.id
       ORDER BY c.class_name, sec.section_name`
    );

    const [classSubjects] = await connection.query(
      `SELECT cs.class_id, cs.section_id, cs.subject_id, cs.required_lectures,
              s.subject_name, s.subject_type,
              ts.teacher_id
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       JOIN teacher_subjects ts
         ON ts.subject_id = cs.subject_id AND ts.class_id = cs.class_id AND ts.section_id = cs.section_id
       ORDER BY cs.section_id, s.subject_type DESC, cs.required_lectures DESC`
    );

    const [classrooms] = await connection.query("SELECT * FROM classrooms ORDER BY capacity");
    const [availabilityRows] = await connection.query(
      "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability"
    );

    const availability = availabilityMap(availabilityRows);
    const teacherBusy = new Set();
    const roomBusy = new Set();
    const sectionBusy = new Set();
    const teacherDayLoad = new Map();

    const assignments = [];

    for (const section of sections) {
      const sectionSubjects = classSubjects.filter((item) => item.section_id === section.section_id);

      for (const item of sectionSubjects) {
        let remaining = item.required_lectures;

        for (const day of DAYS) {
          if (!remaining) {
            break;
          }

          for (let slot = 1; slot <= 6; slot += 1) {
            if (!remaining) {
              break;
            }

            const teacherKey = `${item.teacher_id}-${day}-${slot}`;
            const sectionKey = `${section.section_id}-${day}-${slot}`;
            const teacherAvailable = availability.has(teacherKey) ? availability.get(teacherKey) : true;
            const teacherLoadKey = `${item.teacher_id}-${day}`;
            const currentLoad = teacherDayLoad.get(teacherLoadKey) || 0;

            if (!teacherAvailable || teacherBusy.has(teacherKey) || sectionBusy.has(sectionKey) || currentLoad >= 5) {
              continue;
            }

            const room = chooseRoom(classrooms, item.subject_type, section.strength, roomBusy, day, slot);

            if (!room) {
              continue;
            }

            const timing = SLOT_TIMES[slot];
            assignments.push([
              item.class_id,
              section.section_id,
              item.subject_id,
              item.teacher_id,
              room.id,
              day,
              slot,
              timing.start,
              timing.end,
              adminId || null,
              0
            ]);

            teacherBusy.add(teacherKey);
            sectionBusy.add(sectionKey);
            roomBusy.add(`${room.id}-${day}-${slot}`);
            teacherDayLoad.set(teacherLoadKey, currentLoad + 1);
            remaining -= 1;
          }
        }

        if (remaining > 0) {
          throw new Error(`Unable to fully schedule ${item.subject_name} for section ${section.section_name}.`);
        }
      }
    }

    if (assignments.length) {
      await connection.query(
        `INSERT INTO timetable
          (class_id, section_id, subject_id, teacher_id, classroom_id, day_of_week, slot_number, start_time, end_time, created_by, is_manual_override)
         VALUES ?`,
        [assignments]
      );
    }

    await connection.commit();
    return { inserted: assignments.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getTimetableGrid(sectionId) {
  const [rows] = await pool.query(
    `SELECT tt.day_of_week, tt.slot_number, s.subject_name, t.full_name AS teacher_name, cr.room_name
     FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     JOIN teachers t ON tt.teacher_id = t.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     WHERE tt.section_id = ?
     ORDER BY FIELD(tt.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), tt.slot_number`,
    [sectionId]
  );

  return rows;
}

module.exports = {
  DAYS,
  SLOT_TIMES,
  getAllTimetableEntries,
  updateTimetableEntry,
  deleteTimetableEntry,
  clearTimetable,
  getGenerationData,
  generateTimetable,
  getTimetableGrid
};
