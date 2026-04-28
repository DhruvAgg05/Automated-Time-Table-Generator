const pool = require("../config/db");

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function createGenerationError(message, suggestions = [], meta = {}) {
  const error = new Error(message);
  error.suggestions = suggestions;
  error.meta = meta;
  error.isGenerationError = true;
  return error;
}

async function getSlotTimings() {
  const [rows] = await pool.query(
    "SELECT id, slot_number, start_time, end_time FROM slot_timings ORDER BY slot_number"
  );

  return rows;
}

async function getTimetableSettings() {
  const [rows] = await pool.query(
    "SELECT id, lecture_duration_minutes, lab_duration_minutes FROM timetable_settings ORDER BY id ASC LIMIT 1"
  );

  return rows[0];
}

async function updateTimetableSettings(data) {
  const settings = await getTimetableSettings();
  if (!settings) {
    const [result] = await pool.query(
      "INSERT INTO timetable_settings (lecture_duration_minutes, lab_duration_minutes) VALUES (?, ?)",
      [data.lecture_duration_minutes, data.lab_duration_minutes]
    );
    return result.insertId;
  }

  await pool.query(
    "UPDATE timetable_settings SET lecture_duration_minutes = ?, lab_duration_minutes = ? WHERE id = ?",
    [data.lecture_duration_minutes, data.lab_duration_minutes, settings.id]
  );
  return settings.id;
}

async function createSlotTiming(data) {
  const [result] = await pool.query(
    "INSERT INTO slot_timings (slot_number, start_time, end_time) VALUES (?, ?, ?)",
    [data.slot_number, data.start_time, data.end_time]
  );

  return result.insertId;
}

async function updateSlotTiming(id, data) {
  await pool.query(
    "UPDATE slot_timings SET slot_number = ?, start_time = ?, end_time = ? WHERE id = ?",
    [data.slot_number, data.start_time, data.end_time, id]
  );
}

async function deleteSlotTiming(id) {
  await pool.query("DELETE FROM slot_timings WHERE id = ?", [id]);
}

async function getAllTimetableEntries() {
  const [rows] = await pool.query(
    `SELECT tt.id, tt.class_id, tt.section_id, tt.subject_id, tt.teacher_id, tt.classroom_id,
            tt.day_of_week, tt.slot_number, tt.start_time, tt.end_time, tt.is_manual_override,
            c.class_name, sec.section_name,
            s.subject_name, s.subject_type,
            t.full_name AS teacher_name, t.teacher_code,
            cr.room_name, cr.room_type
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

async function getGenerationData(connection = pool) {
  const [sections] = await connection.query(
    `SELECT sec.id AS section_id, sec.section_name, sec.strength, c.id AS class_id, c.class_name
     FROM sections sec
     JOIN classes c ON sec.class_id = c.id
     ORDER BY c.class_name, sec.section_name`
  );

  const [classSubjects] = await connection.query(
    `SELECT cs.class_id, cs.section_id, cs.subject_id,
            s.subject_name, s.subject_type, s.theory_lectures_per_week, s.lab_sessions_per_week,
            t.id AS teacher_id, t.full_name AS teacher_name, t.teacher_code, t.max_lectures_per_day
     FROM class_subjects cs
     JOIN subjects s ON cs.subject_id = s.id
     JOIN teacher_subjects ts
       ON ts.subject_id = cs.subject_id AND ts.class_id = cs.class_id AND ts.section_id = cs.section_id
     JOIN teachers t ON ts.teacher_id = t.id
     ORDER BY cs.section_id, s.subject_name`
  );

  const [classrooms] = await connection.query("SELECT * FROM classrooms ORDER BY capacity");
  const [availability] = await connection.query(
    "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability"
  );
  const [existing] = await connection.query(
    "SELECT teacher_id, classroom_id, section_id, day_of_week, slot_number FROM timetable"
  );
  const slots = await getSlotTimings();
  const settings = await getTimetableSettings();

  return { sections, classSubjects, classrooms, availability, existing, slots, settings };
}

function availabilityMap(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.teacher_id}-${row.day_of_week}-${row.slot_number}`, row.is_available === 1);
  }
  return map;
}

function buildAvailabilityContext(rows) {
  return {
    map: availabilityMap(rows),
    restrictedTeachers: new Set(rows.map((row) => row.teacher_id))
  };
}

function isTeacherAvailable(availabilityContext, teacherId, day, slotNumber) {
  const key = `${teacherId}-${day}-${slotNumber}`;
  if (availabilityContext.restrictedTeachers.has(teacherId)) {
    return availabilityContext.map.get(key) === true;
  }

  return true;
}

function durationMinutes(startTime, endTime) {
  const [startHour, startMinute] = String(startTime).split(":").map(Number);
  const [endHour, endMinute] = String(endTime).split(":").map(Number);
  return ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute);
}

function buildSlotMeta(slotRows) {
  return slotRows.map((slot) => ({
    ...slot,
    duration: durationMinutes(slot.start_time, slot.end_time)
  }));
}

function getValidLabSequences(slotMeta, labDurationMinutes) {
  const sequences = [];

  for (let index = 0; index < slotMeta.length; index += 1) {
    let total = 0;
    const sequence = [slotMeta[index]];
    total += slotMeta[index].duration;

    if (total === labDurationMinutes) {
      sequences.push(sequence.map((slot) => slot.slot_number));
      continue;
    }

    for (let next = index + 1; next < slotMeta.length; next += 1) {
      const current = slotMeta[next - 1];
      const candidate = slotMeta[next];

      if (String(current.end_time).slice(0, 8) !== String(candidate.start_time).slice(0, 8)) {
        break;
      }

      sequence.push(candidate);
      total += candidate.duration;

      if (total === labDurationMinutes) {
        sequences.push(sequence.map((slot) => slot.slot_number));
        break;
      }

      if (total > labDurationMinutes) {
        break;
      }
    }
  }

  return sequences;
}

function countTeacherAvailableLectureWindows(lectureSlots, teacherId, availabilityLookup) {
  return DAYS.reduce((count, day) => (
    count + lectureSlots.filter((slot) => {
      return isTeacherAvailable(availabilityLookup, teacherId, day, slot.slot_number);
    }).length
  ), 0);
}

function countTeacherAvailableLabWindows(labSequences, teacherId, availabilityLookup) {
  return DAYS.reduce((count, day) => (
    count + labSequences.filter((sequence) => (
      sequence.every((slotNumber) => {
        return isTeacherAvailable(availabilityLookup, teacherId, day, slotNumber);
      })
    )).length
  ), 0);
}

function chooseRoom(classrooms, roomType, strength, roomBusySet, day, slot) {
  const preferred = classrooms.filter((room) => room.room_type === roomType && room.capacity >= strength);
  const fallback = classrooms.filter((room) => room.capacity >= strength);
  const candidates = preferred.length ? preferred : fallback;
  return candidates.find((room) => !roomBusySet.has(`${room.id}-${day}-${slot}`));
}

function validateSlotConfiguration(slotRows, settings, hasLabSubjects) {
  const slotMeta = buildSlotMeta(slotRows);
  const lectureCompatible = slotMeta.some((slot) => slot.duration === settings.lecture_duration_minutes);

  if (!lectureCompatible) {
    throw createGenerationError(
      "Lecture duration and timetable slot configuration are incompatible.",
      [
        "Update slot timings so at least one slot exactly matches the lecture duration.",
        "Reduce lecture duration in timetable settings if your college uses shorter periods.",
        "Recheck whether the slot plan matches the academic timetable pattern."
      ]
    );
  }

  if (hasLabSubjects) {
    const labSequences = getValidLabSequences(slotMeta, settings.lab_duration_minutes);
    if (!labSequences.length) {
      throw createGenerationError(
        `Lab duration is ${settings.lab_duration_minutes} minutes but available slots are incompatible.`,
        [
          "Increase consecutive slots so a full lab block can fit.",
          "Adjust lab duration settings to match your college slot structure.",
          "Update slot timing configuration before generating the timetable."
        ]
      );
    }
  }

  return slotMeta;
}

function validateGenerationFeasibility(data) {
  const { sections, classSubjects, classrooms, availability, slots, settings } = data;
  const availabilityLookup = buildAvailabilityContext(availability);
  const slotMeta = validateSlotConfiguration(
    slots,
    settings,
    classSubjects.some((item) => Number(item.lab_sessions_per_week || 0) > 0)
  );
  const lectureSlots = slotMeta.filter((slot) => slot.duration === settings.lecture_duration_minutes);
  const labSequences = getValidLabSequences(slotMeta, settings.lab_duration_minutes);
  const minimumLabSlotSpan = labSequences.length
    ? Math.min(...labSequences.map((sequence) => sequence.length))
    : 0;

  if (!classSubjects.length) {
    throw createGenerationError(
      "No subject assignments were found for timetable generation.",
      [
        "Assign subjects to classes or sections first.",
        "Assign teachers to the mapped subjects before generating the timetable."
      ]
    );
  }

  const compatibleLectureRooms = classrooms.filter((room) => room.room_type === "Classroom");
  const compatibleLectureRoomPool = compatibleLectureRooms.length ? compatibleLectureRooms : classrooms;
  const compatibleLabRooms = classrooms.filter((room) => room.room_type === "Lab");
  const weeklyTheoryDemand = classSubjects.reduce(
    (total, item) => total + Number(item.theory_lectures_per_week || 0),
    0
  );
  const weeklyLabDemand = classSubjects.reduce(
    (total, item) => total + Number(item.lab_sessions_per_week || 0),
    0
  );
  const totalLectureCapacity = compatibleLectureRoomPool.length * lectureSlots.length * DAYS.length;
  const totalLabCapacity = compatibleLabRooms.length * labSequences.length * DAYS.length;

  if (weeklyTheoryDemand > totalLectureCapacity) {
    throw createGenerationError(
      "Not enough classroom capacity is available for all required theory lectures.",
      [
        "Add more classrooms or increase the number of usable lecture slots.",
        "Reduce parallel section demand across the week.",
        "Review section planning and spread theory sessions more evenly."
      ],
      { weeklyTheoryDemand, totalLectureCapacity }
    );
  }

  if (weeklyLabDemand > totalLabCapacity) {
    throw createGenerationError(
      "Not enough lab room capacity is available for all required lab sessions.",
      [
        "Add more lab rooms or increase consecutive lab-capable slot windows.",
        "Reduce parallel lab sections or spread them across more days.",
        "Review lab duration settings and slot timing compatibility."
      ],
      { weeklyLabDemand, totalLabCapacity }
    );
  }

  const teacherLoadMap = new Map();
  const sectionLoadMap = new Map();

  for (const item of classSubjects) {
    const section = sections.find((entry) => entry.section_id === item.section_id);
    const needsTheory = Number(item.theory_lectures_per_week || 0);
    const needsLab = Number(item.lab_sessions_per_week || 0);
    const labSequenceLength = needsLab > 0 ? minimumLabSlotSpan : 0;

    if (!section) {
      throw createGenerationError(
        `Section assignment is missing for ${item.subject_name}.`,
        [
          "Recheck class and section mapping for this subject.",
          "Make sure the section record exists before timetable generation."
        ]
      );
    }

    if ((item.subject_type === "Theory Only" || item.subject_type === "Both Theory + Lab") && needsTheory <= 0) {
      throw createGenerationError(
        `${item.subject_name} is marked for theory but has zero theory lectures.`,
        [
          "Increase theory lectures per week for this subject.",
          "Change the subject type if it should not include theory."
        ]
      );
    }

    if ((item.subject_type === "Lab Only" || item.subject_type === "Both Theory + Lab") && needsLab <= 0) {
      throw createGenerationError(
        `${item.subject_name} is marked for lab but has zero lab sessions.`,
        [
          "Increase lab sessions per week for this subject.",
          "Change the subject type if it should not include labs."
        ]
      );
    }

    const lectureRoomExists = needsTheory <= 0 || classrooms.some(
      (room) => room.room_type === "Classroom" && room.capacity >= section.strength
    ) || classrooms.some((room) => room.capacity >= section.strength);

    if (!lectureRoomExists) {
      throw createGenerationError(
        `Not enough classrooms available for ${item.subject_name} in ${section.class_name} ${section.section_name}.`,
        [
          "Add more classrooms with enough capacity.",
          "Reduce section strength or split the section differently.",
          "Adjust section scheduling to use larger rooms."
        ]
      );
    }

    if (needsLab > 0) {
      const labRoomExists = classrooms.some(
        (room) => room.room_type === "Lab" && room.capacity >= section.strength
      );

      if (!labRoomExists) {
        throw createGenerationError(
          `Not enough lab rooms available for ${item.subject_name}.`,
          [
            "Add more lab rooms or increase lab room capacity.",
            "Reduce parallel lab sections.",
            "Move some lab sessions to a different day or time."
          ]
        );
      }
    }

    const teacherKey = item.teacher_id;
    const currentLoad = teacherLoadMap.get(teacherKey) || {
      teacher_name: item.teacher_name,
      teacher_code: item.teacher_code,
      max_lectures_per_day: item.max_lectures_per_day,
      theory: 0,
      labSlots: 0
    };
    currentLoad.theory += needsTheory;
    currentLoad.labSlots += needsLab * labSequenceLength;
    teacherLoadMap.set(teacherKey, currentLoad);

    const sectionLoad = sectionLoadMap.get(section.section_id) || 0;
    sectionLoadMap.set(section.section_id, sectionLoad + needsTheory + (needsLab * labSequenceLength));

    const availableLectureCount = countTeacherAvailableLectureWindows(
      lectureSlots,
      item.teacher_id,
      availabilityLookup
    );

    if (needsTheory > 0 && availableLectureCount < needsTheory) {
      throw createGenerationError(
        `Teacher availability is too limited for theory lectures of ${item.subject_name}.`,
        [
          "Increase teacher availability in the availability module.",
          "Assign another teacher to share the subject load.",
          "Reduce weekly theory lecture load if academically acceptable."
        ]
      );
    }

    if (needsLab > 0) {
      const possibleLabWindows = countTeacherAvailableLabWindows(
        labSequences,
        item.teacher_id,
        availabilityLookup
      );

      if (possibleLabWindows < needsLab) {
        throw createGenerationError(
          `Consecutive lab slots are unavailable for ${item.subject_name}.`,
          [
            "Increase consecutive free slots in the timetable.",
            "Increase teacher availability for longer continuous blocks.",
            "Adjust lab duration settings or slot timing configuration."
          ]
        );
      }
    }
  }

  const weeklySectionCapacity = slotMeta.length * DAYS.length;
  for (const section of sections) {
    const demandedSlots = sectionLoadMap.get(section.section_id) || 0;
    if (demandedSlots > weeklySectionCapacity) {
      throw createGenerationError(
        `Too many required periods are assigned to ${section.class_name} ${section.section_name}.`,
        [
          "Reduce weekly subject load for this section.",
          "Move some subjects to another semester or adjust lecture and lab counts.",
          "Increase available weekly slots before generating the timetable."
        ],
        { demandedSlots, weeklySectionCapacity }
      );
    }
  }

  for (const teacher of teacherLoadMap.values()) {
    const weeklyDemand = teacher.theory + teacher.labSlots;
    const weeklyCapacity = Number(teacher.max_lectures_per_day || 5) * DAYS.length;
    const matchingTeacher = classSubjects.find((item) => item.teacher_code === teacher.teacher_code);
    const teacherId = matchingTeacher ? matchingTeacher.teacher_id : null;
    const availableLectureWindows = teacherId
      ? countTeacherAvailableLectureWindows(lectureSlots, teacherId, availabilityLookup)
      : 0;
    const availableLabWindows = teacherId
      ? countTeacherAvailableLabWindows(labSequences, teacherId, availabilityLookup)
      : 0;
    const teacherAvailabilityCapacity = availableLectureWindows + (
      availableLabWindows * minimumLabSlotSpan
    );

    if (weeklyDemand > weeklyCapacity) {
      throw createGenerationError(
        `Teacher workload exceeds available time slots for ${teacher.teacher_name}.`,
        [
          "Increase teacher availability.",
          "Assign another teacher to the subject.",
          "Reduce weekly lecture or lab load for the affected subjects."
        ]
      );
    }

    if (teacherId && weeklyDemand > teacherAvailabilityCapacity) {
      throw createGenerationError(
        `Teacher availability is too limited for the current workload of ${teacher.teacher_name}.`,
        [
          "Increase teacher availability in longer usable blocks.",
          "Assign another teacher to share theory or lab sessions.",
          "Reduce subject load or adjust slot timings to create more feasible windows."
        ],
        { weeklyDemand, teacherAvailabilityCapacity }
      );
    }
  }

  return { slotMeta, lectureSlots, labSequences };
}

async function generateTimetable(adminId) {
  const connection = await pool.getConnection();

  try {
    const baseData = await getGenerationData(connection);
    const { slotMeta, lectureSlots, labSequences } = validateGenerationFeasibility(baseData);

    await connection.beginTransaction();
    await connection.query("DELETE FROM timetable");

    const sectionsById = new Map(baseData.sections.map((section) => [section.section_id, section]));
    const slotLookup = new Map(slotMeta.map((slot) => [slot.slot_number, slot]));
    const schedulingTasks = buildSchedulingTasks(baseData.classSubjects, sectionsById);
    const state = {
      assignments: [],
      teacherBusy: new Set(),
      roomBusy: new Set(),
      sectionBusy: new Set(),
      teacherDayLoad: new Map()
    };
    const searchResult = searchTimetableSolution(schedulingTasks, {
      lectureSlots,
      labSequences,
      slotLookup,
      classrooms: baseData.classrooms,
      availability: buildAvailabilityContext(baseData.availability),
      adminId
    }, state);

    if (!searchResult.success) {
      throw createGenerationError(
        searchResult.failure.message,
        searchResult.failure.suggestions,
        searchResult.failure.meta
      );
    }

    if (state.assignments.length) {
      await connection.query(
        `INSERT INTO timetable
          (class_id, section_id, subject_id, teacher_id, classroom_id, day_of_week, slot_number, start_time, end_time, created_by, is_manual_override)
         VALUES ?`,
        [state.assignments]
      );
    }

    await connection.commit();
    const consecutiveWarnings = countTeacherConsecutiveWarnings(state.assignments);
    return {
      inserted: state.assignments.length,
      warnings: consecutiveWarnings
        ? [`${consecutiveWarnings} teacher back-to-back slot pair(s) were used because a fully break-friendly schedule was not possible for every assignment.`]
        : []
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function buildSchedulingTasks(classSubjects, sectionsById) {
  const tasks = [];

  classSubjects.forEach((item) => {
    const section = sectionsById.get(item.section_id);
    const theoryCount = Number(item.theory_lectures_per_week || 0);
    const labCount = Number(item.lab_sessions_per_week || 0);

    for (let index = 1; index <= theoryCount; index += 1) {
      tasks.push({
        id: `theory-${item.section_id}-${item.subject_id}-${index}`,
        kind: "theory",
        sessionIndex: index,
        ...item,
        section
      });
    }

    for (let index = 1; index <= labCount; index += 1) {
      tasks.push({
        id: `lab-${item.section_id}-${item.subject_id}-${index}`,
        kind: "lab",
        sessionIndex: index,
        ...item,
        section
      });
    }
  });

  return tasks.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "lab" ? -1 : 1;
    }

    if (left.section.strength !== right.section.strength) {
      return right.section.strength - left.section.strength;
    }

    return left.subject_name.localeCompare(right.subject_name);
  });
}

function getSuitableRooms(classrooms, requiredType, strength) {
  const preferred = classrooms.filter((room) => room.room_type === requiredType && room.capacity >= strength);
  if (requiredType === "Classroom" && preferred.length) {
    return preferred.sort((left, right) => left.capacity - right.capacity);
  }

  if (requiredType === "Classroom" && !preferred.length) {
    return classrooms
      .filter((room) => room.capacity >= strength)
      .sort((left, right) => left.capacity - right.capacity);
  }

  return preferred.sort((left, right) => left.capacity - right.capacity);
}

function countTeacherAdjacentAssignments(teacherBusySet, teacherId, day, slotNumbers) {
  const currentSlots = new Set(slotNumbers.map(Number));
  let adjacentCount = 0;

  slotNumbers.forEach((slotNumber) => {
    const previousSlot = Number(slotNumber) - 1;
    const nextSlot = Number(slotNumber) + 1;

    if (!currentSlots.has(previousSlot) && teacherBusySet.has(`${teacherId}-${day}-${previousSlot}`)) {
      adjacentCount += 1;
    }

    if (!currentSlots.has(nextSlot) && teacherBusySet.has(`${teacherId}-${day}-${nextSlot}`)) {
      adjacentCount += 1;
    }
  });

  return adjacentCount;
}

function collectTaskCandidates(task, context, state) {
  const { lectureSlots, labSequences, slotLookup, classrooms, availability } = context;
  const blockerSummary = {
    windowsChecked: 0,
    teacherUnavailable: 0,
    teacherBusy: 0,
    sectionBusy: 0,
    dailyLoadLimit: 0,
    noCapacityRoom: 0,
    roomBusy: 0
  };
  const candidates = [];
  const windows = task.kind === "lab"
    ? labSequences.map((sequence) => sequence.map((slotNumber) => slotLookup.get(slotNumber)))
    : lectureSlots.map((slot) => [slot]);
  const requiredType = task.kind === "lab" ? "Lab" : "Classroom";

  for (const day of DAYS) {
    for (const slotWindow of windows) {
      blockerSummary.windowsChecked += 1;

      const slotNumbers = slotWindow.map((slot) => slot.slot_number);
      const teacherLoadKey = `${task.teacher_id}-${day}`;
      const currentLoad = state.teacherDayLoad.get(teacherLoadKey) || 0;
      if (currentLoad + slotNumbers.length > Number(task.max_lectures_per_day || 5)) {
        blockerSummary.dailyLoadLimit += 1;
        continue;
      }

      const unavailableTeacher = slotNumbers.some((slotNumber) => {
        return !isTeacherAvailable(availability, task.teacher_id, day, slotNumber);
      });
      if (unavailableTeacher) {
        blockerSummary.teacherUnavailable += 1;
        continue;
      }

      const busyTeacher = slotNumbers.some((slotNumber) => state.teacherBusy.has(`${task.teacher_id}-${day}-${slotNumber}`));
      if (busyTeacher) {
        blockerSummary.teacherBusy += 1;
        continue;
      }

      const busySection = slotNumbers.some((slotNumber) => state.sectionBusy.has(`${task.section_id}-${day}-${slotNumber}`));
      if (busySection) {
        blockerSummary.sectionBusy += 1;
        continue;
      }

      const suitableRooms = getSuitableRooms(classrooms, requiredType, task.section.strength);
      if (!suitableRooms.length) {
        blockerSummary.noCapacityRoom += 1;
        continue;
      }

      const freeRooms = suitableRooms.filter((room) => (
        slotNumbers.every((slotNumber) => !state.roomBusy.has(`${room.id}-${day}-${slotNumber}`))
      ));

      if (!freeRooms.length) {
        blockerSummary.roomBusy += 1;
        continue;
      }

      freeRooms.forEach((room) => {
        candidates.push({
          day,
          room,
          slotNumbers,
          slotRecords: slotWindow,
          teacherLoadKey,
          currentLoad,
          adjacencyPenalty: countTeacherAdjacentAssignments(state.teacherBusy, task.teacher_id, day, slotNumbers)
        });
      });
    }
  }

  return {
    candidates: candidates.sort((left, right) => {
      if (left.adjacencyPenalty !== right.adjacencyPenalty) {
        return left.adjacencyPenalty - right.adjacencyPenalty;
      }

      if (left.currentLoad !== right.currentLoad) {
        return left.currentLoad - right.currentLoad;
      }

      if (left.slotNumbers[0] !== right.slotNumbers[0]) {
        return left.slotNumbers[0] - right.slotNumbers[0];
      }

      return left.room.capacity - right.room.capacity;
    }),
    blockerSummary
  };
}

function countTeacherConsecutiveWarnings(assignments) {
  const grouped = new Map();

  assignments.forEach((row) => {
    const [,,, teacherId,, day, slotNumber] = row;
    const key = `${teacherId}-${day}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(Number(slotNumber));
  });

  let consecutivePairs = 0;
  grouped.forEach((slots) => {
    const sorted = [...new Set(slots)].sort((left, right) => left - right);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index] === sorted[index - 1] + 1) {
        consecutivePairs += 1;
      }
    }
  });

  return consecutivePairs;
}

function formatTaskLabel(task) {
  return `${task.subject_name} (${task.section.class_name} ${task.section.section_name})`;
}

function buildFailureFromBlockers(task, blockerSummary, exhaustedAlternatives = false) {
  const sortedReasons = Object.entries(blockerSummary)
    .filter(([key]) => key !== "windowsChecked")
    .sort((left, right) => right[1] - left[1]);
  const [primaryReason] = sortedReasons;
  const taskLabel = formatTaskLabel(task);
  const isLab = task.kind === "lab";
  let message = exhaustedAlternatives
    ? `Timetable search exhausted all valid combinations while scheduling ${taskLabel}.`
    : `Failed because no valid ${isLab ? "lab block" : "lecture slot"} was available for ${taskLabel}.`;
  let suggestions = [
    "Review teacher availability and reduce unnecessary blocked slots.",
    "Check for heavy clashes in the same day and slot combination.",
    "Use the scheduling support view to inspect free teachers and rooms."
  ];

  if (primaryReason) {
    const [reasonKey] = primaryReason;
    if (reasonKey === "teacherUnavailable") {
      message = `Failed because teacher ${task.teacher_code} is unavailable in the remaining valid ${isLab ? "lab blocks" : "lecture slots"} for ${taskLabel}.`;
      suggestions = [
        "Increase teacher availability for the required day and slot combinations.",
        "Assign another teacher to the same subject if possible.",
        "Reduce weekly load for this subject if academically allowed."
      ];
    } else if (reasonKey === "teacherBusy") {
      message = `Failed because teacher ${task.teacher_code} is already occupied in the remaining valid ${isLab ? "lab blocks" : "lecture slots"} for ${taskLabel}.`;
      suggestions = [
        "Reduce teacher clashes by redistributing the teacher's other subjects.",
        "Assign another teacher to one of the overlapping sections.",
        "Regenerate after adjusting teacher assignments or section scheduling."
      ];
    } else if (reasonKey === "sectionBusy") {
      message = `Failed because section ${task.section.class_name} ${task.section.section_name} is already occupied in the remaining valid ${isLab ? "lab blocks" : "lecture slots"} for ${task.subject_name}.`;
      suggestions = [
        "Reduce overlapping subject demand for the section.",
        "Increase weekly slot availability for this section.",
        "Check whether earlier assignments consume all usable windows."
      ];
    } else if (reasonKey === "dailyLoadLimit") {
      message = `Failed because teacher ${task.teacher_code} exceeds the daily lecture limit while scheduling ${taskLabel}.`;
      suggestions = [
        "Increase the teacher's daily lecture limit if college rules allow it.",
        "Spread the subject load across more days.",
        "Assign another teacher to share the same subject load."
      ];
    } else if (reasonKey === "roomBusy") {
      message = `Failed because no free ${isLab ? "lab room" : "classroom"} remained for ${taskLabel} in the compatible time windows.`;
      suggestions = [
        `Add more ${isLab ? "lab rooms" : "classrooms"} or reduce parallel section usage.`,
        "Adjust section scheduling so the same room type is not requested at the same time.",
        "Use the support dashboard to inspect free rooms before regeneration."
      ];
    } else if (reasonKey === "noCapacityRoom") {
      message = `Failed because no ${isLab ? "lab room" : "classroom"} has enough capacity for ${taskLabel}.`;
      suggestions = [
        `Add a larger ${isLab ? "lab room" : "classroom"} for this section.`,
        "Reduce section strength or split the section into batches.",
        "Review room capacity data for incorrect entries."
      ];
    }
  }

  return {
    message,
    suggestions,
    meta: {
      debugLog: [
        `Task checked: ${task.kind.toUpperCase()} ${task.subject_name} for ${task.section.class_name} ${task.section.section_name}`,
        `Teacher: ${task.teacher_code} ${task.teacher_name}`,
        `Windows checked: ${blockerSummary.windowsChecked}`,
        `Teacher unavailable windows: ${blockerSummary.teacherUnavailable}`,
        `Teacher busy windows: ${blockerSummary.teacherBusy}`,
        `Section busy windows: ${blockerSummary.sectionBusy}`,
        `Daily load blocked windows: ${blockerSummary.dailyLoadLimit}`,
        `Capacity blocked windows: ${blockerSummary.noCapacityRoom}`,
        `Room clash windows: ${blockerSummary.roomBusy}`
      ],
      blockerSummary
    }
  };
}

function applyCandidate(task, candidate, context, state) {
  const rowsAdded = [];

  candidate.slotRecords.forEach((slotRecord) => {
    rowsAdded.push([
      task.class_id,
      task.section_id,
      task.subject_id,
      task.teacher_id,
      candidate.room.id,
      candidate.day,
      slotRecord.slot_number,
      slotRecord.start_time,
      slotRecord.end_time,
      context.adminId || null,
      0
    ]);

    state.teacherBusy.add(`${task.teacher_id}-${candidate.day}-${slotRecord.slot_number}`);
    state.sectionBusy.add(`${task.section_id}-${candidate.day}-${slotRecord.slot_number}`);
    state.roomBusy.add(`${candidate.room.id}-${candidate.day}-${slotRecord.slot_number}`);
  });

  state.assignments.push(...rowsAdded);
  state.teacherDayLoad.set(candidate.teacherLoadKey, candidate.currentLoad + candidate.slotNumbers.length);
}

function rollbackCandidate(task, candidate, state) {
  candidate.slotNumbers.forEach((slotNumber) => {
    state.teacherBusy.delete(`${task.teacher_id}-${candidate.day}-${slotNumber}`);
    state.sectionBusy.delete(`${task.section_id}-${candidate.day}-${slotNumber}`);
    state.roomBusy.delete(`${candidate.room.id}-${candidate.day}-${slotNumber}`);
  });

  for (let index = 0; index < candidate.slotNumbers.length; index += 1) {
    state.assignments.pop();
  }

  if (candidate.currentLoad === 0) {
    state.teacherDayLoad.delete(candidate.teacherLoadKey);
  } else {
    state.teacherDayLoad.set(candidate.teacherLoadKey, candidate.currentLoad);
  }
}

function pickNextTask(tasks, context, state) {
  let selected = null;

  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const analysis = collectTaskCandidates(task, context, state);

    if (!analysis.candidates.length) {
      return {
        index,
        task,
        candidates: [],
        failure: buildFailureFromBlockers(task, analysis.blockerSummary)
      };
    }

    if (
      !selected
      || analysis.candidates.length < selected.candidates.length
      || (
        analysis.candidates.length === selected.candidates.length
        && task.kind === "lab"
        && selected.task.kind !== "lab"
      )
    ) {
      selected = {
        index,
        task,
        candidates: analysis.candidates,
        blockerSummary: analysis.blockerSummary
      };
    }
  }

  return selected;
}

function searchTimetableSolution(tasks, context, state) {
  if (!tasks.length) {
    return { success: true };
  }

  const nextTask = pickNextTask(tasks, context, state);
  if (!nextTask.candidates.length) {
    return { success: false, failure: nextTask.failure };
  }

  const remainingTasks = tasks.filter((_, index) => index !== nextTask.index);
  let lastFailure = null;

  for (const candidate of nextTask.candidates) {
    applyCandidate(nextTask.task, candidate, context, state);
    const result = searchTimetableSolution(remainingTasks, context, state);
    if (result.success) {
      return result;
    }

    lastFailure = result.failure;
    rollbackCandidate(nextTask.task, candidate, state);
  }

  return {
    success: false,
    failure: lastFailure || buildFailureFromBlockers(nextTask.task, nextTask.blockerSummary, true)
  };
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

async function findTeacher(search) {
  const [rows] = await pool.query(
    `SELECT id, teacher_code, full_name
     FROM teachers
     WHERE teacher_code LIKE ? OR full_name LIKE ?
     ORDER BY CASE WHEN teacher_code = ? THEN 0 ELSE 1 END, full_name
     LIMIT 1`,
    [`%${search}%`, `%${search}%`, search]
  );

  return rows[0];
}

async function getTeacherTimetableGrid(search) {
  const teacher = await findTeacher(search);
  if (!teacher) {
    throw createGenerationError(
      "Teacher not found for the requested timetable view.",
      [
        "Search by exact teacher code.",
        "Search by full teacher name or a larger part of the name."
      ]
    );
  }

  const [entries] = await pool.query(
    `SELECT tt.day_of_week, tt.slot_number, s.subject_name, c.class_name, sec.section_name, cr.room_name
     FROM timetable tt
     JOIN subjects s ON tt.subject_id = s.id
     JOIN classes c ON tt.class_id = c.id
     JOIN sections sec ON tt.section_id = sec.id
     JOIN classrooms cr ON tt.classroom_id = cr.id
     WHERE tt.teacher_id = ?
     ORDER BY FIELD(tt.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), tt.slot_number`,
    [teacher.id]
  );

  const slots = await getSlotTimings();
    const [availabilityRows] = await pool.query(
    "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability WHERE teacher_id = ?",
    [teacher.id]
  );
  const availability = buildAvailabilityContext(availabilityRows);
  const totalSlots = DAYS.length * slots.length;
  const availableSlots = DAYS.reduce((count, day) => (
    count + slots.filter((slot) => {
      return isTeacherAvailable(availability, teacher.id, day, slot.slot_number);
    }).length
  ), 0);

  return {
    teacher,
    entries,
    summary: {
      assigned_periods: entries.length,
      free_periods: totalSlots - entries.length,
      available_periods: availableSlots,
      unavailable_periods: totalSlots - availableSlots
    }
  };
}

async function getTeacherFreeSlotGrid(search = "") {
  const slots = await getSlotTimings();
  const [teachers] = await pool.query(
    `SELECT id, teacher_code, full_name
     FROM teachers
     WHERE (? = '' OR teacher_code LIKE ? OR full_name LIKE ?)
     ORDER BY full_name`,
    [search, `%${search}%`, `%${search}%`]
  );
  const [availabilityRows] = await pool.query(
    "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability"
  );
  const [timetableRows] = await pool.query(
    "SELECT teacher_id, day_of_week, slot_number FROM timetable"
  );

  const availability = buildAvailabilityContext(availabilityRows);
  const busy = new Set(timetableRows.map((row) => `${row.teacher_id}-${row.day_of_week}-${row.slot_number}`));

  const grid = DAYS.map((day) => ({
    day,
    slots: slots.map((slot) => ({
      slot_number: slot.slot_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      free_teachers: teachers.filter((teacher) => {
        const key = `${teacher.id}-${day}-${slot.slot_number}`;
        const isAvailable = isTeacherAvailable(availability, teacher.id, day, slot.slot_number);
        return isAvailable && !busy.has(key);
      })
    }))
  }));

  return { grid, totalTeachers: teachers.length };
}

async function getSchedulingSupportView(day, slotNumber, search = "") {
  const slots = await getSlotTimings();
  const slot = slots.find((entry) => Number(entry.slot_number) === Number(slotNumber)) || slots[0];
  const selectedDay = day || DAYS[0];

  const [teachers] = await pool.query(
    `SELECT t.id, t.teacher_code, t.full_name, t.max_lectures_per_day
     FROM teachers t
     WHERE (? = '' OR t.teacher_code LIKE ? OR t.full_name LIKE ?)
     ORDER BY t.full_name`,
    [search, `%${search}%`, `%${search}%`]
  );
  const [classrooms] = await pool.query("SELECT id, room_name, room_type, capacity FROM classrooms ORDER BY room_name");
  const [availabilityRows] = await pool.query(
    "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability"
  );
  const [timetableRows] = await pool.query(
    "SELECT teacher_id, classroom_id, day_of_week, slot_number FROM timetable"
  );
  const [teacherWorkloadRows] = await pool.query(
    `SELECT t.id, t.teacher_code, t.full_name, t.max_lectures_per_day,
            COUNT(tt.id) AS assigned_periods
     FROM teachers t
     LEFT JOIN timetable tt ON tt.teacher_id = t.id
     GROUP BY t.id, t.teacher_code, t.full_name, t.max_lectures_per_day
     ORDER BY assigned_periods DESC, t.full_name`
  );

  const availability = buildAvailabilityContext(availabilityRows);
  const busyTeacher = new Set(
    timetableRows
      .filter((row) => row.day_of_week === selectedDay && Number(row.slot_number) === Number(slot.slot_number))
      .map((row) => row.teacher_id)
  );
  const busyRoom = new Set(
    timetableRows
      .filter((row) => row.day_of_week === selectedDay && Number(row.slot_number) === Number(slot.slot_number))
      .map((row) => row.classroom_id)
  );

  const freeTeachers = teachers.filter((teacher) => {
    const isAvailable = isTeacherAvailable(availability, teacher.id, selectedDay, slot.slot_number);
    return isAvailable && !busyTeacher.has(teacher.id);
  });

  const freeClassrooms = classrooms.filter((room) => room.room_type === "Classroom" && !busyRoom.has(room.id));
  const freeLabs = classrooms.filter((room) => room.room_type === "Lab" && !busyRoom.has(room.id));

  const overloadedTeachers = teacherWorkloadRows.filter((teacher) => {
    const weeklyCapacity = Number(teacher.max_lectures_per_day || 5) * DAYS.length;
    return Number(teacher.assigned_periods) >= weeklyCapacity * 0.8;
  }).map((teacher) => ({
    ...teacher,
    weekly_capacity: Number(teacher.max_lectures_per_day || 5) * DAYS.length
  }));

  return {
    selectedDay,
    selectedSlot: slot,
    freeTeachers,
    freeClassrooms,
    freeLabs,
    overloadedTeachers
  };
}

function getDayFromDate(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const labels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return labels[date.getDay()];
}

function rangesOverlap(startA, endA, startB, endB) {
  return !(Number(endA) < Number(startB) || Number(startA) > Number(endB));
}

async function cleanupExpiredExtraLectureRequests(connection = pool) {
  await connection.query(
    `UPDATE extra_lecture_requests
     SET status = 'Completed', notification_message = NULL, notification_seen = 1
     WHERE status = 'Approved'
       AND (
         requested_date < CURDATE()
         OR (requested_date = CURDATE() AND end_time < CURTIME())
       )`
  );
}

async function getTeacherRequestableSubjects(teacherId) {
  const [rows] = await pool.query(
    `SELECT ts.teacher_id, ts.subject_id, ts.class_id, ts.section_id,
            s.subject_name, s.subject_code, s.subject_type,
            c.class_name, sec.section_name
     FROM teacher_subjects ts
     JOIN subjects s ON ts.subject_id = s.id
     JOIN classes c ON ts.class_id = c.id
     JOIN sections sec ON ts.section_id = sec.id
     WHERE ts.teacher_id = ?
     ORDER BY c.class_name, sec.section_name, s.subject_name`,
    [teacherId]
  );

  return rows;
}

async function getActiveExtraRequests(connection, requestedDate) {
  const [rows] = await connection.query(
    `SELECT request_id, teacher_id, class_id, section_id, room_id, requested_day, requested_date,
            slot_number, end_slot_number, start_time, end_time, status
     FROM extra_lecture_requests
     WHERE status = 'Approved'
       AND requested_date = ?`,
    [requestedDate]
  );

  return rows;
}

async function getRegularTimetableForDay(connection, requestedDay) {
  const [rows] = await connection.query(
    `SELECT id, teacher_id, class_id, section_id, classroom_id AS room_id, day_of_week,
            slot_number, slot_number AS end_slot_number, start_time, end_time
     FROM timetable
     WHERE day_of_week = ?`,
    [requestedDay]
  );

  return rows;
}

function buildSlotRange(slotRows, startSlotNumber, endSlotNumber) {
  const sortedSlots = slotRows
    .filter((slot) => Number(slot.slot_number) >= Number(startSlotNumber) && Number(slot.slot_number) <= Number(endSlotNumber))
    .sort((left, right) => Number(left.slot_number) - Number(right.slot_number));

  if (!sortedSlots.length || sortedSlots.length !== (Number(endSlotNumber) - Number(startSlotNumber) + 1)) {
    throw createGenerationError(
      "Selected slot range is invalid.",
      [
        "Choose valid start and end slots from the configured slot timings.",
        "Check whether the selected slots exist in slot settings."
      ]
    );
  }

  for (let index = 1; index < sortedSlots.length; index += 1) {
    const previous = sortedSlots[index - 1];
    const current = sortedSlots[index];
    if (String(previous.end_time).slice(0, 8) !== String(current.start_time).slice(0, 8)) {
      throw createGenerationError(
        "Selected slots are not consecutive.",
        [
          "Choose directly connected slots for temporary lectures or labs.",
          "Update slot timings if your schedule has a different continuous block structure."
        ]
      );
    }
  }

  return sortedSlots;
}

function validateTemporaryRequestSlots(slotRows, requestType, settings) {
  const totalDuration = slotRows.reduce((total, slot) => total + durationMinutes(slot.start_time, slot.end_time), 0);
  const expectedDuration = requestType === "Lab"
    ? Number(settings.lab_duration_minutes)
    : Number(settings.lecture_duration_minutes);

  if (totalDuration !== expectedDuration) {
    throw createGenerationError(
      `${requestType} duration does not match the configured slot duration.`,
      [
        `Select slots totaling exactly ${expectedDuration} minutes.`,
        "Adjust lecture or lab duration settings if the college policy changed.",
        "Review slot timing configuration before submitting the request."
      ],
      { totalDuration, expectedDuration }
    );
  }

  return {
    start_time: slotRows[0].start_time,
    end_time: slotRows[slotRows.length - 1].end_time,
    totalDuration
  };
}

function buildOccupancyLookup(rows) {
  return {
    teacherBusy: new Set(rows.map((row) => `${row.teacher_id}-${row.slot_number}-${row.end_slot_number}`)),
    roomBusy: new Set(rows.filter((row) => row.room_id).map((row) => `${row.room_id}-${row.slot_number}-${row.end_slot_number}`)),
    sectionBusy: new Set(rows.map((row) => `${row.section_id}-${row.slot_number}-${row.end_slot_number}`))
  };
}

function rowOverlapsRequest(row, slotStart, slotEnd) {
  return rangesOverlap(row.slot_number, row.end_slot_number, slotStart, slotEnd);
}

async function getAvailabilityAndOccupancyForDate(requestedDate, teacherId) {
  await cleanupExpiredExtraLectureRequests();
  const requestedDay = getDayFromDate(requestedDate);
  const [slots, settings, classrooms, teacherAvailabilityRows, regularRows, extraRows] = await Promise.all([
    getSlotTimings(),
    getTimetableSettings(),
    pool.query("SELECT id, room_name, room_type, capacity FROM classrooms ORDER BY room_type, room_name"),
    pool.query(
      "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability WHERE teacher_id = ?",
      [teacherId]
    ),
    getRegularTimetableForDay(pool, requestedDay),
    getActiveExtraRequests(pool, requestedDate)
  ]);

  return {
    requestedDay,
    slots,
    settings,
    classrooms: classrooms[0],
    teacherAvailability: buildAvailabilityContext(teacherAvailabilityRows[0]),
    regularRows,
    extraRows
  };
}

function getFreeTeacherSlotsForDate(slotRows, requestedDay, teacherId, teacherAvailability, occupancyRows) {
  const busyRows = occupancyRows.filter((row) => row.teacher_id === teacherId);
  return slotRows.filter((slot) => {
    const available = isTeacherAvailable(teacherAvailability, teacherId, requestedDay, slot.slot_number);
    const occupied = busyRows.some((row) => rowOverlapsRequest(row, slot.slot_number, slot.slot_number));
    return available && !occupied;
  });
}

function getFreeRoomsForSlotRange(classrooms, occupancyRows, slotStart, slotEnd, roomTypeNeeded, search = "") {
  return classrooms.filter((room) => {
    const matchesType = roomTypeNeeded === "All" ? true : room.room_type === roomTypeNeeded;
    const matchesSearch = !search || `${room.room_name} ${room.room_type}`.toLowerCase().includes(search.toLowerCase());
    const occupied = occupancyRows.some((row) => row.room_id === room.id && rowOverlapsRequest(row, slotStart, slotEnd));
    return matchesType && matchesSearch && !occupied;
  });
}

async function getRoomFreeSlotView({ requestedDate, roomType = "All", search = "" }) {
  await cleanupExpiredExtraLectureRequests();
  const selectedDate = requestedDate || new Date().toISOString().slice(0, 10);
  const selectedDay = getDayFromDate(selectedDate);
  const [slots, classrooms, regularRows, extraRows] = await Promise.all([
    getSlotTimings(),
    pool.query("SELECT id, room_name, room_type, capacity FROM classrooms ORDER BY room_type, room_name"),
    getRegularTimetableForDay(pool, selectedDay),
    getActiveExtraRequests(pool, selectedDate)
  ]);
  const occupancyRows = [...regularRows, ...extraRows];
  const roomRows = classrooms[0];

  const grid = slots.map((slot) => ({
    slot_number: slot.slot_number,
    start_time: slot.start_time,
    end_time: slot.end_time,
    free_rooms: getFreeRoomsForSlotRange(
      roomRows,
      occupancyRows,
      slot.slot_number,
      slot.slot_number,
      roomType,
      search
    )
  }));

  return {
    selectedDate,
    selectedDay,
    roomType,
    grid
  };
}

async function getExtraLectureDashboard(teacherId, requestedDate, roomType = "All", search = "") {
  const context = await getAvailabilityAndOccupancyForDate(requestedDate, teacherId);
  const allOccupancy = [...context.regularRows, ...context.extraRows];
  const ownFreeSlots = getFreeTeacherSlotsForDate(
    context.slots,
    context.requestedDay,
    teacherId,
    context.teacherAvailability,
    allOccupancy
  );
  const roomGrid = context.slots.map((slot) => ({
    slot_number: slot.slot_number,
    start_time: slot.start_time,
    end_time: slot.end_time,
    free_rooms: getFreeRoomsForSlotRange(
      context.classrooms,
      allOccupancy,
      slot.slot_number,
      slot.slot_number,
      roomType,
      search
    )
  }));
  const subjects = await getTeacherRequestableSubjects(teacherId);

  return {
    selectedDate: requestedDate,
    selectedDay: context.requestedDay,
    ownFreeSlots,
    roomGrid,
    subjects
  };
}

async function getExtraLectureRequests(filters = {}) {
  await cleanupExpiredExtraLectureRequests();
  const conditions = [];
  const params = [];

  if (filters.teacherId) {
    conditions.push("er.teacher_id = ?");
    params.push(filters.teacherId);
  }

  if (filters.status) {
    conditions.push("er.status = ?");
    params.push(filters.status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT er.request_id, er.teacher_id, er.subject_id, er.class_id, er.section_id, er.request_type,
            er.room_type_needed, er.room_id, er.requested_day, er.requested_date, er.slot_number,
            er.end_slot_number, er.start_time, er.end_time, er.status, er.notes, er.admin_notes,
            er.notification_message, er.notification_seen, er.created_at,
            t.teacher_code, t.full_name AS teacher_name,
            s.subject_name, s.subject_code,
            c.class_name, sec.section_name,
            cr.room_name
     FROM extra_lecture_requests er
     JOIN teachers t ON er.teacher_id = t.id
     JOIN subjects s ON er.subject_id = s.id
     JOIN classes c ON er.class_id = c.id
     JOIN sections sec ON er.section_id = sec.id
     LEFT JOIN classrooms cr ON er.room_id = cr.id
     ${whereClause}
     ORDER BY FIELD(er.status, 'Pending', 'Needs Reschedule', 'Approved', 'Rejected', 'Cancelled', 'Completed'),
              er.requested_date DESC, er.start_time DESC, er.created_at DESC`,
    params
  );

  return rows;
}

async function validateExtraLectureRequestPayload(teacherId, payload, existingRequestId = null) {
  const slots = await getSlotTimings();
  const settings = await getTimetableSettings();
  const requestedDate = payload.requested_date;
  const requestedDay = getDayFromDate(requestedDate);
  const slotNumber = Number(payload.slot_number);
  const endSlotNumber = Number(payload.end_slot_number);
  const slotRows = buildSlotRange(slots, slotNumber, endSlotNumber);
  const durationMeta = validateTemporaryRequestSlots(slotRows, payload.request_type, settings);
  const roomTypeNeeded = payload.room_type_needed || (payload.request_type === "Lab" ? "Lab" : "Classroom");

  if (requestedDay === "Sunday") {
    throw createGenerationError(
      "Extra lecture requests cannot be created for Sunday.",
      [
        "Choose a working academic day from Monday to Saturday."
      ]
    );
  }

  const [subjectRows, roomRows, teacherAvailabilityRows, regularRows, extraRows] = await Promise.all([
    pool.query(
      `SELECT ts.teacher_id, ts.subject_id, ts.class_id, ts.section_id,
              s.subject_name, s.subject_code, s.subject_type
       FROM teacher_subjects ts
       JOIN subjects s ON ts.subject_id = s.id
       WHERE ts.teacher_id = ? AND ts.subject_id = ? AND ts.class_id = ? AND ts.section_id = ?`,
      [teacherId, payload.subject_id, payload.class_id, payload.section_id]
    ),
    payload.room_id ? pool.query("SELECT id, room_name, room_type FROM classrooms WHERE id = ?", [payload.room_id]) : Promise.resolve([[]]),
    pool.query(
      "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability WHERE teacher_id = ?",
      [teacherId]
    ),
    getRegularTimetableForDay(pool, requestedDay),
    getActiveExtraRequests(pool, requestedDate)
  ]);

  if (!subjectRows[0].length) {
    throw createGenerationError(
      "Selected subject is not assigned to this teacher for the chosen class and section.",
      [
        "Select one of your assigned subjects from the teacher request list."
      ]
    );
  }

  const assignedSubject = subjectRows[0][0];
  if (assignedSubject.subject_type === "Theory Only" && payload.request_type === "Lab") {
    throw createGenerationError(
      "This subject is assigned as theory only and cannot be requested as a lab.",
      ["Choose Lecture for this subject or select a lab-enabled subject."]
    );
  }

  if (assignedSubject.subject_type === "Lab Only" && payload.request_type === "Lecture") {
    throw createGenerationError(
      "This subject is assigned as lab only and cannot be requested as a lecture.",
      ["Choose Lab for this subject or select a theory-enabled subject."]
    );
  }

  const occupancyRows = [
    ...regularRows,
    ...extraRows.filter((row) => !existingRequestId || Number(row.request_id) !== Number(existingRequestId))
  ];
  const teacherAvailability = buildAvailabilityContext(teacherAvailabilityRows[0]);

  const unavailable = slotRows.some((slot) => !isTeacherAvailable(teacherAvailability, teacherId, requestedDay, slot.slot_number));
  if (unavailable) {
    throw createGenerationError(
      `Teacher ${subjectRows[0][0].teacher_id} is unavailable for the requested extra ${payload.request_type.toLowerCase()}.`,
      [
        "Choose one of your currently free slots.",
        "Check the updated free-slot view before submitting again."
      ]
    );
  }

  const teacherConflict = occupancyRows.some((row) => row.teacher_id === Number(teacherId) && rowOverlapsRequest(row, slotNumber, endSlotNumber));
  if (teacherConflict) {
    throw createGenerationError(
      "Teacher already has a lecture or approved temporary request in the selected slot.",
      [
        "Choose another free slot from your teacher free-slot view."
      ]
    );
  }

  const sectionConflict = occupancyRows.some((row) => row.section_id === Number(payload.section_id) && rowOverlapsRequest(row, slotNumber, endSlotNumber));
  if (sectionConflict) {
    throw createGenerationError(
      "Selected class or section already has another lecture in the requested slot.",
      [
        "Choose another free slot for this class or section.",
        "Review the section timetable before submitting again."
      ]
    );
  }

  if (payload.room_id) {
    const room = roomRows[0][0];
    if (!room) {
      throw createGenerationError("Requested room was not found.", ["Select a valid classroom or lab room."]);
    }

    if (room.room_type !== roomTypeNeeded) {
      throw createGenerationError(
        "Requested room type does not match the selected extra lecture type.",
        [
          `Choose a ${roomTypeNeeded.toLowerCase()} for this request.`
        ]
      );
    }

    const roomConflict = occupancyRows.some((row) => row.room_id === Number(payload.room_id) && rowOverlapsRequest(row, slotNumber, endSlotNumber));
    if (roomConflict) {
      throw createGenerationError(
        `Requested room ${room.room_name} is already occupied in the selected slot.`,
        [
          "Choose another room from the free-room view.",
          "Select another free slot if this room is required."
        ]
      );
    }
  }

  const [duplicateRows] = await pool.query(
    `SELECT request_id
     FROM extra_lecture_requests
     WHERE teacher_id = ? AND subject_id = ? AND class_id = ? AND section_id = ?
       AND requested_date = ? AND slot_number = ? AND end_slot_number = ?
       AND status IN ('Pending', 'Approved', 'Needs Reschedule')
       ${existingRequestId ? "AND request_id <> ?" : ""}`,
    existingRequestId
      ? [teacherId, payload.subject_id, payload.class_id, payload.section_id, requestedDate, slotNumber, endSlotNumber, existingRequestId]
      : [teacherId, payload.subject_id, payload.class_id, payload.section_id, requestedDate, slotNumber, endSlotNumber]
  );

  if (duplicateRows.length) {
    throw createGenerationError(
      "A similar extra lecture request already exists for this teacher and slot.",
      [
        "Check your request list before submitting a duplicate request."
      ]
    );
  }

  return {
    requested_day: requestedDay,
    requested_date: requestedDate,
    slot_number: slotNumber,
    end_slot_number: endSlotNumber,
    start_time: durationMeta.start_time,
    end_time: durationMeta.end_time,
    room_type_needed: roomTypeNeeded
  };
}

async function createExtraLectureRequest(teacherId, payload) {
  await cleanupExpiredExtraLectureRequests();
  const normalized = await validateExtraLectureRequestPayload(teacherId, payload);
  const [result] = await pool.query(
    `INSERT INTO extra_lecture_requests
      (teacher_id, subject_id, class_id, section_id, request_type, room_type_needed, room_id, requested_day, requested_date,
       slot_number, end_slot_number, start_time, end_time, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    [
      teacherId,
      Number(payload.subject_id),
      Number(payload.class_id),
      Number(payload.section_id),
      payload.request_type,
      normalized.room_type_needed,
      payload.room_id ? Number(payload.room_id) : null,
      normalized.requested_day,
      normalized.requested_date,
      normalized.slot_number,
      normalized.end_slot_number,
      normalized.start_time,
      normalized.end_time,
      payload.notes || null
    ]
  );

  return result.insertId;
}

async function approveExtraLectureRequest(requestId, adminId, payload = {}) {
  await cleanupExpiredExtraLectureRequests();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const [[request]] = await connection.query(
      `SELECT * FROM extra_lecture_requests WHERE request_id = ? FOR UPDATE`,
      [requestId]
    );

    if (!request) {
      throw createGenerationError("Extra lecture request not found.", ["Refresh the request list and try again."]);
    }

    if (!["Pending", "Needs Reschedule"].includes(request.status)) {
      throw createGenerationError(
        `Only pending requests can be approved. Current status: ${request.status}.`,
        ["Refresh the request list before approving again."]
      );
    }

    const requestedDay = request.requested_day;
    const [slots, teacherAvailabilityRows, regularRows, approvedExtras, roomRows] = await Promise.all([
      getSlotTimings(),
      connection.query(
        "SELECT teacher_id, day_of_week, slot_number, is_available FROM teacher_availability WHERE teacher_id = ?",
        [request.teacher_id]
      ),
      getRegularTimetableForDay(connection, requestedDay),
      getActiveExtraRequests(connection, request.requested_date),
      connection.query("SELECT id, room_name, room_type FROM classrooms ORDER BY room_type, room_name")
    ]);

    const slotRows = buildSlotRange(slots, request.slot_number, request.end_slot_number);
    const teacherAvailability = buildAvailabilityContext(teacherAvailabilityRows[0]);
    if (slotRows.some((slot) => !isTeacherAvailable(teacherAvailability, request.teacher_id, requestedDay, slot.slot_number))) {
      throw createGenerationError(
        "Teacher is not available in the requested slot anymore.",
        [
          "Ask the teacher to choose another free slot.",
          "Check the updated free-slot view before approval."
        ]
      );
    }

    const occupancyRows = [
      ...regularRows,
      ...approvedExtras.filter((row) => Number(row.request_id) !== Number(requestId))
    ];

    const teacherConflict = occupancyRows.some((row) => row.teacher_id === request.teacher_id && rowOverlapsRequest(row, request.slot_number, request.end_slot_number));
    if (teacherConflict) {
      throw createGenerationError(
        "Teacher now has another approved lecture in the requested slot.",
        [
          "Reject or reschedule this extra lecture request.",
          "Check the teacher free-slot view before approving again."
        ]
      );
    }

    const sectionConflict = occupancyRows.some((row) => row.section_id === request.section_id && rowOverlapsRequest(row, request.slot_number, request.end_slot_number));
    if (sectionConflict) {
      throw createGenerationError(
        "The selected class or section already has another approved lecture in this slot.",
        [
          "Choose another free slot for the class or section."
        ]
      );
    }

    const roomCatalog = roomRows[0].filter((room) => room.room_type === request.room_type_needed);
    const assignedRoomId = payload.room_id ? Number(payload.room_id) : (request.room_id ? Number(request.room_id) : null);
    let selectedRoom = assignedRoomId
      ? roomCatalog.find((room) => Number(room.id) === assignedRoomId)
      : roomCatalog.find((room) => !occupancyRows.some((row) => row.room_id === room.id && rowOverlapsRequest(row, request.slot_number, request.end_slot_number)));

    if (!selectedRoom) {
      throw createGenerationError(
        `No free ${request.room_type_needed.toLowerCase()} is available for approval in the requested slot.`,
        [
          "Choose another room from the room free-slot view.",
          "Ask the teacher to choose another date or slot."
        ]
      );
    }

    const roomConflict = occupancyRows.some((row) => row.room_id === selectedRoom.id && rowOverlapsRequest(row, request.slot_number, request.end_slot_number));
    if (roomConflict) {
      throw createGenerationError(
        `Selected room ${selectedRoom.room_name} is already assigned in that slot.`,
        [
          "Choose another free room before approving."
        ]
      );
    }

    await connection.query(
      `UPDATE extra_lecture_requests
       SET status = 'Approved', room_id = ?, approved_by = ?, admin_notes = ?, notification_message = ?, notification_seen = 0
       WHERE request_id = ?`,
      [
        selectedRoom.id,
        adminId,
        payload.admin_notes || null,
        `Your extra ${request.request_type.toLowerCase()} request has been approved for ${request.requested_day} ${String(request.start_time).slice(0, 5)}-${String(request.end_time).slice(0, 5)} in ${selectedRoom.room_name}.`,
        requestId
      ]
    );

    const [conflictingPending] = await connection.query(
      `SELECT request_id, teacher_id, room_id, request_type
       FROM extra_lecture_requests
       WHERE request_id <> ?
         AND status = 'Pending'
         AND requested_date = ?
         AND (
           teacher_id = ?
           OR (room_id IS NOT NULL AND room_id = ?)
         )
         AND NOT (end_slot_number < ? OR slot_number > ?)`,
      [requestId, request.requested_date, request.teacher_id, selectedRoom.id, request.slot_number, request.end_slot_number]
    );

    for (const conflicting of conflictingPending) {
      const isTeacherConflict = Number(conflicting.teacher_id) === Number(request.teacher_id);
      const conflictMessage = isTeacherConflict
        ? `Your requested extra lecture slot on ${request.requested_day} ${String(request.start_time).slice(0, 5)}-${String(request.end_time).slice(0, 5)} is no longer available because you already have another approved lecture in that time. Please choose another free slot.`
        : `Your requested extra lecture slot on ${request.requested_day} ${String(request.start_time).slice(0, 5)}-${String(request.end_time).slice(0, 5)} for ${selectedRoom.room_name} is no longer available because it has been assigned to another teacher. Please select another free slot.`;

      await connection.query(
        `UPDATE extra_lecture_requests
         SET status = 'Needs Reschedule', notification_message = ?, notification_seen = 0, admin_notes = COALESCE(admin_notes, 'Conflicting request needs reschedule.')
         WHERE request_id = ?`,
        [conflictMessage, conflicting.request_id]
      );
    }

    await connection.commit();
    return {
      room_name: selectedRoom.room_name,
      conflictedRequests: conflictingPending.length
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function rejectExtraLectureRequest(requestId, adminNotes) {
  await cleanupExpiredExtraLectureRequests();
  const [result] = await pool.query(
    `UPDATE extra_lecture_requests
     SET status = 'Rejected', admin_notes = ?, notification_message = ?, notification_seen = 0
     WHERE request_id = ? AND status IN ('Pending', 'Needs Reschedule')`,
    [
      adminNotes || null,
      adminNotes
        ? `Your extra lecture request was rejected. Admin note: ${adminNotes}`
        : "Your extra lecture request was rejected by admin.",
      requestId
    ]
  );

  if (!result.affectedRows) {
    throw createGenerationError("Request cannot be rejected in its current state.", ["Refresh the request list and try again."]);
  }
}

async function cancelExtraLectureRequest(requestId, actor) {
  await cleanupExpiredExtraLectureRequests();
  const [rows] = await pool.query(
    `SELECT request_id, teacher_id, requested_date, end_time, status
     FROM extra_lecture_requests
     WHERE request_id = ?`,
    [requestId]
  );
  const request = rows[0];

  if (!request) {
    throw createGenerationError("Extra lecture request not found.", ["Refresh the request list and try again."]);
  }

  if (actor.role === "teacher" && Number(request.teacher_id) !== Number(actor.teacher_id)) {
    throw createGenerationError("You can only cancel your own extra lecture requests.", []);
  }

  if (!["Pending", "Approved", "Needs Reschedule"].includes(request.status)) {
    throw createGenerationError("Only pending or approved requests can be cancelled.", []);
  }

  const [timeRows] = await pool.query("SELECT CURDATE() AS today_date, CURTIME() AS now_time");
  const currentDate = String(timeRows[0].today_date).slice(0, 10);
  const currentTime = String(timeRows[0].now_time).slice(0, 8);
  if (
    request.status === "Approved"
    && (
      String(request.requested_date).slice(0, 10) < currentDate
      || (String(request.requested_date).slice(0, 10) === currentDate && String(request.end_time).slice(0, 8) <= currentTime)
    )
  ) {
    throw createGenerationError(
      "Approved extra lectures cannot be cancelled after the scheduled time has passed.",
      [
        "Cancel approved requests before the lecture or lab is completed."
      ]
    );
  }

  const [result] = await pool.query(
    `UPDATE extra_lecture_requests
     SET status = 'Cancelled', notification_message = 'This extra lecture request has been cancelled.', notification_seen = 0
     WHERE request_id = ?`,
    [requestId]
  );

  return result.affectedRows;
}

async function markExtraLectureNotificationSeen(requestId, teacherId) {
  await pool.query(
    `UPDATE extra_lecture_requests
     SET notification_seen = 1
     WHERE request_id = ? AND teacher_id = ?`,
    [requestId, teacherId]
  );
}

module.exports = {
  DAYS,
  getAllTimetableEntries,
  updateTimetableEntry,
  deleteTimetableEntry,
  clearTimetable,
  getGenerationData,
  generateTimetable,
  getTimetableGrid,
  getTeacherTimetableGrid,
  getTeacherFreeSlotGrid,
  getSchedulingSupportView,
  getRoomFreeSlotView,
  getExtraLectureDashboard,
  getExtraLectureRequests,
  createExtraLectureRequest,
  approveExtraLectureRequest,
  rejectExtraLectureRequest,
  cancelExtraLectureRequest,
  markExtraLectureNotificationSeen,
  getSlotTimings,
  createSlotTiming,
  updateSlotTiming,
  deleteSlotTiming,
  getTimetableSettings,
  updateTimetableSettings
};
