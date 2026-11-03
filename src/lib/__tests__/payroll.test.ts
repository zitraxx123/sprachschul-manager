import { describe, it, expect, vi, afterEach } from "vitest";
import { calculateLessonPayroll, evaluateCancellationStatus } from "@/lib/payroll";

const teacher = { hourly_rate: 30, rate_group: null, rate_individual: null, rate_45: null, rate_60: null, rate_90: null };

describe("calculateLessonPayroll", () => {
  it("returns 0 without teacher", () => {
    expect(calculateLessonPayroll(1.5, "group", null).totalAmount).toBe(0);
  });
  it("uses standard hourly rate", () => {
    const r = calculateLessonPayroll(1.5, "group", teacher);
    expect(r.rateType).toBe("standard");
    expect(r.totalAmount).toBe(45);
  });
  it("prefers specialised rates by course type", () => {
    expect(calculateLessonPayroll(2, "individual", { ...teacher, rate_individual: 40 }).totalAmount).toBe(80);
    expect(calculateLessonPayroll(2, "group", { ...teacher, rate_group: 25 }).totalAmount).toBe(50);
    // group rate must not be used for an individual course
    expect(calculateLessonPayroll(1, "individual", { ...teacher, rate_group: 25 }).totalAmount).toBe(30);
  });
  it("uses flat rates for 45/60/90 minutes before hourly rates", () => {
    const t = { ...teacher, rate_45: 20, rate_60: 28, rate_90: 40, rate_group: 25 };
    expect(calculateLessonPayroll(0.75, "group", t)).toMatchObject({ rateType: "flat_45", totalAmount: 20 });
    expect(calculateLessonPayroll(1, "group", t)).toMatchObject({ rateType: "flat_60", totalAmount: 28 });
    expect(calculateLessonPayroll(1.5, "group", t)).toMatchObject({ rateType: "flat_90", totalAmount: 40 });
  });
  it("pays nothing for an early student cancellation", () => {
    expect(calculateLessonPayroll(1, "group", teacher, "cancelled_by_student").totalAmount).toBe(0);
  });
  it("pays the configured percentage for a late cancellation", () => {
    expect(calculateLessonPayroll(1, "group", teacher, "cancelled_late", 50).totalAmount).toBe(15);
    expect(calculateLessonPayroll(1, "group", teacher, "cancelled_late", 100).totalAmount).toBe(30);
  });
  it("clamps the late cancellation percentage to 0..100", () => {
    expect(calculateLessonPayroll(1, "group", teacher, "cancelled_late", 250).totalAmount).toBe(30);
  });
  it("rounds to cents", () => {
    expect(calculateLessonPayroll(0.3333, "group", { ...teacher, hourly_rate: 10 }).totalAmount).toBe(3.33);
  });
});

describe("evaluateCancellationStatus", () => {
  afterEach(() => vi.useRealTimers());
  it("is late when less than the threshold remains", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    expect(evaluateCancellationStatus("2026-11-04", "10:00", 24)).toMatchObject({ isLate: true, status: "cancelled_late" });
  });
  it("is free when enough time remains", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    expect(evaluateCancellationStatus("2026-11-05", "10:00", 24)).toMatchObject({ isLate: false, status: "cancelled_by_student" });
  });
});
