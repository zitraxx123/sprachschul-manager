import type { LessonOverride, ScheduleCourse } from "@/lib/schedule";
import { resolveOccurrencesForDate, timeToMinutes } from "@/lib/schedule";

export const MISSED_LOOKBACK_DAYS = 30;

export interface UnrecordedOccurrence {
  /** courseId|date|startTime */
  key: string;
  courseId: string;
  courseName: string;
  date: string; // effective date YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number;
  teacherId: string;
  originalTeacherId: string | null;
  isSubstituted: boolean;
  isMoved: boolean;
}

type CourseForMissed = ScheduleCourse & { name: string; created_at?: string | null };

/** Current date (YYYY-MM-DD) and minutes since midnight in Europe/Berlin. */
export function berlinNow(now: Date = new Date()): { date: string; minutes: number } {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const [h, m] = time.split(":").map(Number);
  return { date, minutes: (h % 24) * 60 + m };
}

export function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Past occurrences of the course schedules (with one-off overrides applied) that have no
 * lesson record yet. Matching is by course + date: if n lessons exist for a course on a day,
 * the first n occurrences of that day count as recorded.
 *
 * Only occurrences that are over (earlier date, or today and already ended) and that lie
 * after the creation date of the course are returned.
 */
export function findUnrecordedOccurrences(params: {
  courses: CourseForMissed[];
  overrides: LessonOverride[];
  lessons: Array<{ course_id: string | null; lesson_date: string }>;
  today: string;
  nowMinutes: number;
  lookbackDays?: number;
}): UnrecordedOccurrence[] {
  const { courses, overrides, lessons, today, nowMinutes } = params;
  const lookback = params.lookbackDays ?? MISSED_LOOKBACK_DAYS;

  const recorded = new Map<string, number>();
  for (const l of lessons) {
    if (!l.course_id) continue;
    const k = `${l.course_id}|${l.lesson_date}`;
    recorded.set(k, (recorded.get(k) || 0) + 1);
  }

  const result: UnrecordedOccurrence[] = [];

  for (let i = 0; i <= lookback; i++) {
    const date = shiftDate(today, -i);
    const occurrences = resolveOccurrencesForDate(courses, overrides, date);

    // occurrences are sorted by start time; count how many per course were already consumed
    const consumed = new Map<string, number>();
    for (const occ of occurrences) {
      const courseId = occ.course.id;
      const alreadyRecorded = recorded.get(`${courseId}|${date}`) || 0;
      const seen = consumed.get(courseId) || 0;
      consumed.set(courseId, seen + 1);
      if (seen < alreadyRecorded) continue;

      const course = occ.course as CourseForMissed;
      const createdOn = course.created_at ? course.created_at.slice(0, 10) : null;
      if (createdOn && date < createdOn) continue;
      if (!occ.teacherId) continue;

      const isOver = date < today || (date === today && timeToMinutes(occ.startTime) + occ.duration * 60 <= nowMinutes);
      if (!isOver) continue;

      result.push({
        key: `${courseId}|${date}|${occ.startTime}`,
        courseId,
        courseName: course.name,
        date,
        startTime: occ.startTime,
        duration: occ.duration,
        teacherId: occ.teacherId,
        originalTeacherId:
          occ.isSubstituted && occ.originalTeacherId !== occ.teacherId ? occ.originalTeacherId : null,
        isSubstituted: occ.isSubstituted,
        isMoved: occ.isMoved,
      });
    }
  }

  // newest first, then by start time
  return result.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : b.date.localeCompare(a.date)));
}
