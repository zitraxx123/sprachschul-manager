/**
 * Schedule resolver: combines the recurring course template (course_schedules)
 * with one-off exceptions (lesson_overrides) into concrete, dated occurrences.
 *
 * Pure functions only - safe to use on server and client.
 */

export const GERMAN_WEEKDAYS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
] as const;

export interface LessonOverride {
  id?: string;
  course_id: string;
  lesson_date: string; // original date YYYY-MM-DD
  original_start_time: string; // HH:MM
  new_date?: string | null;
  new_start_time?: string | null;
  new_duration?: number | string | null;
  new_teacher_id?: string | null;
  original_teacher_id?: string | null;
  reason?: string | null;
}

export interface ScheduleSlot {
  id?: string;
  day_of_week: string;
  start_time: string;
  duration: number | string;
}

export interface ScheduleCourse {
  id: string;
  teacher_id: string | null;
  room_id?: string | null;
  course_schedules?: ScheduleSlot[] | null;
}

export interface ResolvedOccurrence<C extends ScheduleCourse> {
  course: C;
  /** Template slot this occurrence came from (synthetic if the template changed since). */
  schedule: ScheduleSlot;
  /** Effective values (after override). */
  date: string;
  startTime: string; // HH:MM
  duration: number;
  teacherId: string | null;
  /** Template values. */
  originalDate: string;
  originalStartTime: string;
  originalTeacherId: string | null;
  override: LessonOverride | null;
  isMoved: boolean;
  isSubstituted: boolean;
}

/** "9:00", "09:00:00" -> "09:00" */
export function normTime(t: string | null | undefined): string {
  if (!t) return "00:00";
  const [h = "0", m = "0"] = t.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0").slice(0, 2)}`;
}

export function timeToMinutes(t: string): number {
  const [h = "0", m = "0"] = t.split(":");
  return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
}

/** German weekday name for a YYYY-MM-DD string (timezone independent). */
export function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  return GERMAN_WEEKDAYS[new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay()];
}

export function overlaps(
  startA: number,
  durationHoursA: number,
  startB: number,
  durationHoursB: number
): boolean {
  const endA = startA + durationHoursA * 60;
  const endB = startB + durationHoursB * 60;
  return startA < endB && endA > startB;
}

function overrideKey(courseId: string, date: string, startTime: string) {
  return `${courseId}|${date}|${normTime(startTime)}`;
}

function applyOverride<C extends ScheduleCourse>(
  course: C,
  schedule: ScheduleSlot,
  originalDate: string,
  override: LessonOverride | null
): ResolvedOccurrence<C> {
  const originalStartTime = normTime(schedule.start_time);
  const templateDuration = Number(schedule.duration) || 1.5;
  const newStart = override?.new_start_time ? normTime(override.new_start_time) : null;
  const newDuration = override?.new_duration != null ? Number(override.new_duration) : null;
  const newDate = override?.new_date || null;
  const teacherId = override?.new_teacher_id || course.teacher_id;

  return {
    course,
    schedule,
    date: newDate || originalDate,
    startTime: newStart || originalStartTime,
    duration: newDuration && newDuration > 0 ? newDuration : templateDuration,
    teacherId,
    originalDate,
    originalStartTime,
    originalTeacherId: course.teacher_id,
    override,
    isMoved: Boolean(
      override &&
        ((newDate && newDate !== originalDate) ||
          (newStart && newStart !== originalStartTime) ||
          (newDuration && newDuration !== templateDuration))
    ),
    isSubstituted: Boolean(
      override?.new_teacher_id && override.new_teacher_id !== course.teacher_id
    ),
  };
}

/**
 * All occurrences that effectively take place on `dateStr`:
 *  - template slots for that weekday that have no override or whose override keeps the date
 *  - overrides of other dates that were moved onto `dateStr`
 * Sorted by effective start time.
 */
export function resolveOccurrencesForDate<C extends ScheduleCourse>(
  courses: C[],
  overrides: LessonOverride[],
  dateStr: string
): ResolvedOccurrence<C>[] {
  const overrideMap = new Map<string, LessonOverride>();
  overrides.forEach((o) =>
    overrideMap.set(overrideKey(o.course_id, o.lesson_date, o.original_start_time), o)
  );

  const result: ResolvedOccurrence<C>[] = [];
  const weekday = weekdayOf(dateStr);

  // 1. Template slots whose ORIGINAL date is dateStr
  courses.forEach((course) => {
    (course.course_schedules || []).forEach((sched) => {
      if (sched.day_of_week !== weekday) return;
      const override = overrideMap.get(overrideKey(course.id, dateStr, sched.start_time)) || null;
      const occ = applyOverride(course, sched, dateStr, override);
      if (occ.date === dateStr) result.push(occ);
    });
  });

  // 2. Overrides of OTHER dates moved onto dateStr
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  overrides.forEach((o) => {
    if (!o.new_date || o.new_date !== dateStr || o.lesson_date === dateStr) return;
    const course = courseMap.get(o.course_id);
    if (!course) return;
    result.push(applyOverride(course, findOrSynthesizeSlot(course, o), o.lesson_date, o));
  });

  // 3. Overrides on dateStr whose template slot no longer exists (template changed afterwards)
  overrides.forEach((o) => {
    if (o.lesson_date !== dateStr || (o.new_date && o.new_date !== dateStr)) return;
    const course = courseMap.get(o.course_id);
    if (!course) return;
    const hasSlot = (course.course_schedules || []).some(
      (s) => s.day_of_week === weekday && normTime(s.start_time) === normTime(o.original_start_time)
    );
    if (!hasSlot) {
      result.push(applyOverride(course, findOrSynthesizeSlot(course, o), o.lesson_date, o));
    }
  });

  return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function findOrSynthesizeSlot(course: ScheduleCourse, o: LessonOverride): ScheduleSlot {
  const found = (course.course_schedules || []).find(
    (s) => s.day_of_week === weekdayOf(o.lesson_date) && normTime(s.start_time) === normTime(o.original_start_time)
  );
  if (found) return found;
  return {
    day_of_week: weekdayOf(o.lesson_date),
    start_time: o.original_start_time,
    duration: o.new_duration != null ? Number(o.new_duration) : 1.5,
  };
}

export type ConflictKind = "teacher" | "room";

export interface ScheduleConflict {
  kind: ConflictKind;
  courseName: string;
  startTime: string;
  duration: number;
}

/**
 * Checks whether placing an occurrence at (date, start, duration) with the given
 * teacher/room collides with another occurrence that day.
 * `self` identifies the occurrence being edited so it does not conflict with itself.
 */
export function findScheduleConflicts<C extends ScheduleCourse & { name: string }>(params: {
  courses: C[];
  overrides: LessonOverride[];
  date: string;
  startTime: string;
  duration: number;
  teacherId: string | null;
  roomId: string | null;
  self: { courseId: string; originalDate: string; originalStartTime: string };
}): ScheduleConflict[] {
  const { courses, overrides, date, startTime, duration, teacherId, roomId, self } = params;
  const start = timeToMinutes(startTime);
  const conflicts: ScheduleConflict[] = [];

  resolveOccurrencesForDate(courses, overrides, date).forEach((occ) => {
    const isSelf =
      occ.course.id === self.courseId &&
      occ.originalDate === self.originalDate &&
      occ.originalStartTime === normTime(self.originalStartTime);
    if (isSelf) return;
    if (!overlaps(start, duration, timeToMinutes(occ.startTime), occ.duration)) return;

    if (teacherId && occ.teacherId === teacherId) {
      conflicts.push({ kind: "teacher", courseName: occ.course.name, startTime: occ.startTime, duration: occ.duration });
    }
    if (roomId && occ.course.room_id === roomId) {
      conflicts.push({ kind: "room", courseName: occ.course.name, startTime: occ.startTime, duration: occ.duration });
    }
  });

  return conflicts;
}
