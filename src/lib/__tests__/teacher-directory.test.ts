import { describe, it, expect } from "vitest";
import { attachTeachers } from "@/lib/teacher-directory";
import { isFullAdmin } from "@/lib/roles";

const dir = [{ id: "t1", organization_id: "o", name: "Anna", email: null }];

describe("attachTeachers", () => {
  it("fills null teacher embeds, also nested, and keeps existing ones", () => {
    const data = [
      { id: "c1", teacher_id: "t1", teachers: null },
      { student_courses: [{ courses: { teacher_id: "t1", teachers: null } }] },
      { teacher_id: "t1", teachers: { id: "t1", name: "Real", hourly_rate: 30 } },
      { teacher_id: "unknown", teachers: null },
    ];
    attachTeachers(data, dir);
    expect(data[0].teachers).toEqual(dir[0]);
    expect((data[1] as { student_courses: Array<{ courses: { teachers: unknown } }> }).student_courses[0].courses.teachers).toEqual(dir[0]);
    expect((data[2].teachers as { name: string }).name).toBe("Real");
    expect(data[3].teachers).toBeNull();
  });
});

describe("roles", () => {
  it("only owner and admin are full admins", () => {
    expect(isFullAdmin("owner")).toBe(true);
    expect(isFullAdmin("admin")).toBe(true);
    expect(isFullAdmin("assistant")).toBe(false);
    expect(isFullAdmin("teacher")).toBe(false);
    expect(isFullAdmin(undefined)).toBe(false);
  });
});
