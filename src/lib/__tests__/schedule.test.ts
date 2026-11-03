import { describe, it, expect } from "vitest";
import { normTime, timeToMinutes, weekdayOf, overlaps, resolveOccurrencesForDate, findScheduleConflicts } from "@/lib/schedule";

// 2026-11-02 is a Monday
const courses = [
  { id: "c1", name: "A1", teacher_id: "t1", room_id: "r1", course_schedules: [{ day_of_week: "Montag", start_time: "10:00:00", duration: 1.5 }] },
  { id: "c2", name: "B1", teacher_id: "t2", room_id: "r2", course_schedules: [{ day_of_week: "Montag", start_time: "10:30", duration: 1 }] },
];

describe("time helpers", () => {
  it("normalises times and weekdays", () => {
    expect(normTime("9:00")).toBe("09:00");
    expect(normTime("09:00:00")).toBe("09:00");
    expect(normTime(null)).toBe("00:00");
    expect(timeToMinutes("10:30")).toBe(630);
    expect(weekdayOf("2026-11-02")).toBe("Montag");
  });
  it("detects overlap but not touching intervals", () => {
    expect(overlaps(600, 1.5, 630, 1)).toBe(true);
    expect(overlaps(600, 1, 660, 1)).toBe(false);
  });
});

describe("resolveOccurrencesForDate", () => {
  it("returns template occurrences sorted by time", () => {
    const occ = resolveOccurrencesForDate(courses, [], "2026-11-02");
    expect(occ.map((o) => o.course.id)).toEqual(["c1", "c2"]);
    expect(resolveOccurrencesForDate(courses, [], "2026-11-03")).toHaveLength(0);
  });
  it("applies a substitute teacher", () => {
    const occ = resolveOccurrencesForDate(courses, [{ course_id: "c1", lesson_date: "2026-11-02", original_start_time: "10:00", new_teacher_id: "t9" }], "2026-11-02");
    const c1 = occ.find((o) => o.course.id === "c1")!;
    expect(c1.teacherId).toBe("t9");
    expect(c1.isSubstituted).toBe(true);
  });
  it("moves an occurrence to another date", () => {
    const ov = [{ course_id: "c1", lesson_date: "2026-11-02", original_start_time: "10:00", new_date: "2026-11-04", new_start_time: "15:00" }];
    expect(resolveOccurrencesForDate(courses, ov, "2026-11-02").map((o) => o.course.id)).toEqual(["c2"]);
    const moved = resolveOccurrencesForDate(courses, ov, "2026-11-04");
    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({ startTime: "15:00", isMoved: true, originalDate: "2026-11-02" });
  });
});

describe("findScheduleConflicts", () => {
  it("finds teacher and room conflicts, ignoring itself", () => {
    const self = { courseId: "c1", originalDate: "2026-11-02", originalStartTime: "10:00" };
    const conflicts = findScheduleConflicts({
      courses, overrides: [], date: "2026-11-02", startTime: "10:00", duration: 1.5, teacherId: "t2", roomId: "r2", self,
    });
    expect(conflicts.map((c) => c.kind).sort()).toEqual(["room", "teacher"]);
    const none = findScheduleConflicts({
      courses, overrides: [], date: "2026-11-02", startTime: "10:00", duration: 1.5, teacherId: "t1", roomId: "r1", self,
    });
    expect(none).toHaveLength(0);
  });
});
