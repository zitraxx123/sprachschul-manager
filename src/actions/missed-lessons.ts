"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { loadUnrecordedLessons } from "@/lib/missed-lessons-data";

export type MissedLessonsState = {
  success?: boolean;
  errorCode?: "forbidden" | "notFound" | "invalid" | "nothing" | "db";
  detail?: string;
  recorded?: number;
  skipped?: number;
};

export interface MissedLessonSelection {
  /** courseId|date|startTime as returned by the panel */
  key: string;
}

/**
 * Records past scheduled occurrences that have no lesson yet (admin only).
 * The list of valid occurrences is recomputed on the server, so stale or forged selections are ignored.
 * outcome "completed" -> paid lesson, "cancelled" -> recorded as cancelled (no payout).
 */
export async function recordMissedLessons(
  selections: MissedLessonSelection[],
  outcome: "completed" | "cancelled"
): Promise<MissedLessonsState> {
  if (!Array.isArray(selections) || selections.length === 0 || selections.length > 200) return { errorCode: "invalid" };
  if (outcome !== "completed" && outcome !== "cancelled") return { errorCode: "invalid" };

  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { errorCode: "notFound" };
  if (!membership || membership.role === "teacher") return { errorCode: "forbidden" };

  const supabase = await createClient();
  const open = await loadUnrecordedLessons(supabase, organization.id);
  const byKey = new Map(open.map((o) => [o.key, o]));

  const chosen = Array.from(new Set(selections.map((s) => s.key)))
    .map((key) => byKey.get(key))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const skipped = selections.length - chosen.length;

  if (chosen.length === 0) return { errorCode: "nothing", skipped };

  const rows = chosen.map((o) => ({
    organization_id: organization.id,
    teacher_id: o.teacherId,
    original_teacher_id: o.originalTeacherId,
    course_id: o.courseId,
    student_name: o.courseName,
    lesson_date: o.date,
    duration_hours: o.duration,
    notes:
      outcome === "completed"
        ? `Kurs: ${o.courseName} (nachgetragen)`
        : `Kurs: ${o.courseName} (ausgefallen, nachgetragen)`,
    status: outcome === "completed" ? ("completed" as const) : ("cancelled_by_student" as const),
  }));

  const { error } = await supabase.from("lessons").insert(rows);
  if (error) return { errorCode: "db", detail: error.message };

  revalidatePath("/lessons");
  revalidatePath("/my-portal");
  revalidatePath("/teachers");
  revalidatePath("/dashboard");
  return { success: true, recorded: rows.length, skipped };
}
