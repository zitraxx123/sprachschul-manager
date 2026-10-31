import { Teacher } from "@/types/database";

export interface LessonPayrollCalculation {
  rateUsed: number;
  rateType: "individual" | "group" | "flat_45" | "flat_60" | "flat_90" | "standard";
  rateDescription: string;
  totalAmount: number;
}

/**
 * Calculates teacher's earnings for a specific lesson based on:
 * - Course type (individual vs group)
 * - Specialized hourly rates (rate_individual, rate_group)
 * - Duration flat rates (rate_45, rate_60, rate_90)
 * - Standard fallback hourly rate
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
  } | null
): LessonPayrollCalculation {
  if (!teacher) {
    return {
      rateUsed: 0,
      rateType: "standard",
      rateDescription: "Kein Satz hinterlegt",
      totalAmount: 0,
    };
  }

  const durationMinutes = Math.round(durationHours * 60);

  // 1. Duration flat rates (if explicitly matched: 45 min, 60 min, 90 min)
  if (durationMinutes === 45 && teacher.rate_45 && Number(teacher.rate_45) > 0) {
    const flat = Number(teacher.rate_45);
    return {
      rateUsed: flat,
      rateType: "flat_45",
      rateDescription: "Pauschale (45 Min.)",
      totalAmount: flat,
    };
  }

  if (durationMinutes === 60 && teacher.rate_60 && Number(teacher.rate_60) > 0) {
    const flat = Number(teacher.rate_60);
    return {
      rateUsed: flat,
      rateType: "flat_60",
      rateDescription: "Pauschale (60 Min.)",
      totalAmount: flat,
    };
  }

  if (durationMinutes === 90 && teacher.rate_90 && Number(teacher.rate_90) > 0) {
    const flat = Number(teacher.rate_90);
    return {
      rateUsed: flat,
      rateType: "flat_90",
      rateDescription: "Pauschale (90 Min.)",
      totalAmount: flat,
    };
  }

  // 2. Specialized course rates: Individual vs Group
  if (courseType === "individual" && teacher.rate_individual && Number(teacher.rate_individual) > 0) {
    const rate = Number(teacher.rate_individual);
    return {
      rateUsed: rate,
      rateType: "individual",
      rateDescription: "Einzelunterricht-Satz",
      totalAmount: Math.round(durationHours * rate * 100) / 100,
    };
  }

  if (courseType === "group" && teacher.rate_group && Number(teacher.rate_group) > 0) {
    const rate = Number(teacher.rate_group);
    return {
      rateUsed: rate,
      rateType: "group",
      rateDescription: "Gruppenunterricht-Satz",
      totalAmount: Math.round(durationHours * rate * 100) / 100,
    };
  }

  // 3. Fallback: standard hourly rate
  const standardRate = Number(teacher.hourly_rate || 0);
  return {
    rateUsed: standardRate,
    rateType: "standard",
    rateDescription: "Standard-Stundensatz",
    totalAmount: Math.round(durationHours * standardRate * 100) / 100,
  };
}
