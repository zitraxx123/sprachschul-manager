import { describe, it, expect } from "vitest";
import { berlinNow, shiftDate, findUnrecordedOccurrences } from "@/lib/missed-lessons";

const course = {
  id: "c1", name: "A1", teacher_id: "t1", room_id: null, created_at: "2026-01-01T00:00:00Z",
  course_schedules: [{ day_of_week: "Montag", start_time: "10:00", duration: 1 }],
};

describe("date helpers", () => {
  it("shifts dates across month borders", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("computes Berlin time (winter UTC+1, summer UTC+2)", () => {
    expect(berlinNow(new Date("2026-01-15T23:30:00Z"))).toEqual({ date: "2026-01-16", minutes: 30 });
    expect(berlinNow(new Date("2026-07-15T10:00:00Z"))).toEqual({ date: "2026-07-15", minutes: 720 });
  });
});

describe("findUnrecordedOccurrences", () => {
  // Monday 2026-11-02
  const base = { courses: [course], overrides: [], today: "2026-11-02", lookbackDays: 7 };
  it("returns past occurrences without a lesson, and skips recorded ones", () => {
    const res = findUnrecordedOccurrences({ ...base, lessons: [], nowMinutes: 13 * 60 });
    expect(res.map((r) => r.date)).toEqual(["2026-11-02", "2026-10-26"]);
    const rec = findUnrecordedOccurrences({ ...base, lessons: [{ course_id: "c1", lesson_date: "2026-10-26" }], nowMinutes: 13 * 60 });
    expect(rec.map((r) => r.date)).toEqual(["2026-11-02"]);
  });
  it("does not return today's lesson before it has ended", () => {
    const res = findUnrecordedOccurrences({ ...base, lessons: [], nowMinutes: 10 * 60 + 30 });
    expect(res.map((r) => r.date)).toEqual(["2026-10-26"]);
  });
  it("ignores dates before the course was created", () => {
    const res = findUnrecordedOccurrences({
      ...base, courses: [{ ...course, created_at: "2026-11-01T00:00:00Z" }], lessons: [], nowMinutes: 13 * 60,
    });
    expect(res.map((r) => r.date)).toEqual(["2026-11-02"]);
  });
});
