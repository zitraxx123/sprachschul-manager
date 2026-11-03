import type { createClient } from "@/lib/supabase/server";
import type { LessonOverride } from "@/lib/schedule";
import {
  MISSED_LOOKBACK_DAYS,
  UnrecordedOccurrence,
  berlinNow,
  findUnrecordedOccurrences,
  shiftDate,
} from "@/lib/missed-lessons";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Loads schedules, overrides and recorded lessons and returns the past occurrences without a lesson record. */
export async function loadUnrecordedLessons(
  supabase: SupabaseClient,
  organizationId: string
): Promise<UnrecordedOccurrence[]> {
  const { date: today, minutes } = berlinNow();
  const from = shiftDate(today, -(MISSED_LOOKBACK_DAYS + 1));

  const [coursesRes, overridesRes, lessonsRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, teacher_id, created_at, course_schedules(id, day_of_week, start_time, duration)")
      .eq("organization_id", organizationId),
    supabase
      .from("lesson_overrides")
      .select("*")
      .eq("organization_id", organizationId)
      .or(`lesson_date.gte.${from},new_date.gte.${from}`),
    supabase
      .from("lessons")
      .select("course_id, lesson_date")
      .eq("organization_id", organizationId)
      .gte("lesson_date", from),
  ]);

  // Fail soft: this is a convenience panel, it must never break the page
  if (coursesRes.error || lessonsRes.error) return [];

  return findUnrecordedOccurrences({
    courses: (coursesRes.data || []) as unknown as Parameters<typeof findUnrecordedOccurrences>[0]["courses"],
    overrides: (overridesRes.data || []) as LessonOverride[],
    lessons: lessonsRes.data || [],
    today,
    nowMinutes: minutes,
  });
}
