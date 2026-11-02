import { Teacher, LessonStatus } from "@/types/database";

export interface LessonPayrollCalculation {
  rateUsed: number;
  rateType: "individual" | "group" | "flat_45" | "flat_60" | "flat_90" | "standard";
  rateDescription: string;
  totalAmount: number;
}

/**
 * Evaluates whether a cancellation is timely (free) or late (chargeable fee)
 * based on the scheduled start date and time vs. current time.
 */
export function evaluateCancellationStatus(
  lessonDate: string,
  startTime: string,
  lateCancellationHours: number = 24
): {
  status: "cancelled_by_student" | "cancelled_late";
  hoursUntilLesson: number;
  isLate: boolean;
} {
  const [year, month, day] = lessonDate.split("-").map(Number);
  const [hours, minutes] = (startTime || "00:00").split(":").map(Number);
  const lessonStart = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

  const now = new Date();
  const diffMs = lessonStart.getTime() - now.getTime();
  const hoursUntilLesson = diffMs / (1000 * 60 * 60);

  const isLate = hoursUntilLesson < lateCancellationHours;
  const status: "cancelled_by_student" | "cancelled_late" = isLate
    ? "cancelled_late"
    : "cancelled_by_student";

  return {
    status,
    hoursUntilLesson: Math.round(hoursUntilLesson * 10) / 10,
    isLate,
  };
}

/**
 * Calculates teacher's earnings for a specific lesson based on:
 * - Course type (individual vs group)
 * - Specialized hourly rates (rate_individual, rate_group)
 * - Duration flat rates (rate_45, rate_60, rate_90)
 * - Standard fallback hourly rate
 * - Lesson status (completed, cancelled_by_student, cancelled_late)
 * - Late cancellation payout percentage (default 50%)
 */
export function calculateLessonPayroll(
  durationHours: number,
  courseType?: "group" | "individual" | string | null,
  teacher?: Teacher | {
    hourly_rate: number;
    rate_group?: number | null;
    rate_individual?: number | null;
    rate_45?: number | null;
    rate_60?: number | null;
    rate_90?: number | null;
  } | null,
  lessonStatus?: LessonStatus | string | null,
  lateCancellationPayPercent: number = 50
): LessonPayrollCalculation {
  if (!teacher) {
    return {
      rateUsed: 0,
      rateType: "standard",
      rateDescription: "Kein Satz hinterlegt",
      totalAmount: 0,
    };
  }

  // If student cancelled in advance (> late_cancellation_hours): teacher gets 0 €
  if (lessonStatus === "cancelled_by_student") {
    return {
      rateUsed: 0,
      rateType: "standard",
      rateDescription: "Schüler abgesagt (0 €)",
      totalAmount: 0,
    };
  }

  const durationMinutes = Math.round(durationHours * 60);
  let baseCalc: LessonPayrollCalculation;

  // 1. Duration flat rates (if explicitly matched: 45 min, 60 min, 90 min)
  if (durationMinutes === 45 && teacher.rate_45 && Number(teacher.rate_45) > 0) {
    const flat = Number(teacher.rate_45);
    baseCalc = {
      rateUsed: flat,
      rateType: "flat_45",
      rateDescription: "Pauschale (45 Min.)",
      totalAmount: flat,
    };
  } else if (durationMinutes === 60 && teacher.rate_60 && Number(teacher.rate_60) > 0) {
    const flat = Number(teacher.rate_60);
    baseCalc = {
      rateUsed: flat,
      rateType: "flat_60",
      rateDescription: "Pauschale (60 Min.)",
      totalAmount: flat,
    };
  } else if (durationMinutes === 90 && teacher.rate_90 && Number(teacher.rate_90) > 0) {
    const flat = Number(teacher.rate_90);
    baseCalc = {
      rateUsed: flat,
      rateType: "flat_90",
      rateDescription: "Pauschale (90 Min.)",
      totalAmount: flat,
    };
  } else if (courseType === "individual" && teacher.rate_individual && Number(teacher.rate_individual) > 0) {
    // 2. Specialized course rates: Individual vs Group
    const rate = Number(teacher.rate_individual);
    baseCalc = {
      rateUsed: rate,
      rateType: "individual",
      rateDescription: "Einzelunterricht-Satz",
      totalAmount: Math.round(durationHours * rate * 100) / 100,
    };
  } else if (courseType === "group" && teacher.rate_group && Number(teacher.rate_group) > 0) {
    const rate = Number(teacher.rate_group);
    baseCalc = {
      rateUsed: rate,
      rateType: "group",
      rateDescription: "Gruppenunterricht-Satz",
      totalAmount: Math.round(durationHours * rate * 100) / 100,
    };
  } else {
    // 3. Fallback: standard hourly rate
    const standardRate = Number(teacher.hourly_rate || 0);
    baseCalc = {
      rateUsed: standardRate,
      rateType: "standard",
      rateDescription: "Standard-Stundensatz",
      totalAmount: Math.round(durationHours * standardRate * 100) / 100,
    };
  }

  // If late cancellation: teacher gets percent (e.g. 50%) of the regular fee
  if (lessonStatus === "cancelled_late") {
    const percent = Math.max(0, Math.min(100, Number(lateCancellationPayPercent) || 50));
    const discountedAmount = Math.round((baseCalc.totalAmount * percent) / 100 * 100) / 100;
    return {
      rateUsed: baseCalc.rateUsed,
      rateType: baseCalc.rateType,
      rateDescription: `${baseCalc.rateDescription} • Spätabsage (${percent}%)`,
      totalAmount: discountedAmount,
    };
  }

  return baseCalc;
}
