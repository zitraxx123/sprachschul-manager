"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  getActiveOrganization,
  getCurrentMembership,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  findScheduleConflicts,
  LessonOverride,
  normTime,
  ScheduleCourse,
  ScheduleConflict,
  weekdayOf,
} from "@/lib/schedule";

export type OverrideErrorCode =
  | "forbidden"
  | "invalid"
  | "notFound"
  | "teacherBusy"
  | "roomBusy"
  | "db";

export type OverrideActionState = {
  success?: boolean;
  errorCode?: OverrideErrorCode;
  /** Human readable context for conflicts / db errors (course name + time or db message). */
  detail?: string;
};

export type SaveOverrideInput = {
  courseId: string;
  /** Template occurrence being changed */
  originalDate: string; // YYYY-MM-DD
  originalStartTime: string; // HH:MM
  /** Desired effective values. Pass the template values (or null) for "unchanged". */
  newDate?: string | null;
  newStartTime?: string | null;
  newDuration?: number | null;
  newTeacherId?: string | null;
  reason?: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

function revalidateSchedulePaths() {
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/courses");
}

async function requireAdmin(): Promise<boolean> {
  const membership = await getCurrentMembership();
  return Boolean(membership && membership.role !== "teacher");
}

function conflictDetail(c: ScheduleConflict): string {
  const end = (() => {
    const [h, m] = c.startTime.split(":").map((v) => parseInt(v, 10));
    const total = h * 60 + m + Math.round(c.duration * 60);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();
  return `${c.courseName} (${c.startTime}–${end})`;
}

/**
 * Create / update / remove a one-off override for a single occurrence of a course.
 * The course template (courses, course_schedules) is never touched.
 */
export async function saveLessonOverride(input: SaveOverrideInput): Promise<OverrideActionState> {
  if (!(await requireAdmin())) return { errorCode: "forbidden" };

  const originalStart = normTime(input.originalStartTime);
  if (
    !input.courseId ||
    !DATE_RE.test(input.originalDate) ||
    !TIME_RE.test(input.originalStartTime) ||
    (input.newDate && !DATE_RE.test(input.newDate)) ||
    (input.newStartTime && !TIME_RE.test(input.newStartTime)) ||
    (input.newDuration != null && !(Number(input.newDuration) > 0 && Number(input.newDuration) <= 12))
  ) {
    return { errorCode: "invalid" };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { errorCode: "forbidden" };

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, name, teacher_id, room_id, course_schedules(id, day_of_week, start_time, duration)")
    .eq("id", input.courseId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!course) return { errorCode: "notFound" };

  const { data: existing } = await supabase
    .from("lesson_overrides")
    .select("*")
    .eq("course_id", course.id)
    .eq("lesson_date", input.originalDate)
    .eq("original_start_time", originalStart)
    .maybeSingle();

  const templateSlot = (course.course_schedules || []).find(
    (s) =>
      s.day_of_week === weekdayOf(input.originalDate) &&
      normTime(s.start_time) === originalStart
  );
  if (!templateSlot && !existing) return { errorCode: "notFound" };

  const templateDuration = Number(templateSlot?.duration ?? existing?.new_duration ?? 1.5);

  // Normalize: values equal to the template mean "no override" for that field.
  const newDate = input.newDate && input.newDate !== input.originalDate ? input.newDate : null;
  const newStart =
    input.newStartTime && normTime(input.newStartTime) !== originalStart
      ? normTime(input.newStartTime)
      : null;
  const newDuration =
    input.newDuration != null && Number(input.newDuration) !== templateDuration
      ? Number(input.newDuration)
      : null;
  const newTeacher =
    input.newTeacherId && input.newTeacherId !== course.teacher_id ? input.newTeacherId : null;

  // Nothing differs from the template -> remove override (if any)
  if (!newDate && !newStart && !newDuration && !newTeacher) {
    if (existing) {
      const { error } = await supabase.from("lesson_overrides").delete().eq("id", existing.id);
      if (error) return { errorCode: "db", detail: error.message };
      revalidateSchedulePaths();
    }
    return { success: true };
  }

  // Validate teacher belongs to this school
  if (newTeacher) {
    const { data: t } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", newTeacher)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!t) return { errorCode: "notFound" };
  }

  // --- Conflict check (room & teacher double booking) on the effective date ---
  const effDate = newDate || input.originalDate;
  const effStart = newStart || originalStart;
  const effDuration = newDuration || templateDuration;
  const effTeacher = newTeacher || course.teacher_id;

  const timeChanged = Boolean(newDate || newStart || newDuration);
  const teacherChanged = Boolean(newTeacher);

  const [{ data: allCourses }, { data: dayOverrides }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, teacher_id, room_id, course_schedules(id, day_of_week, start_time, duration)")
      .eq("organization_id", organization.id),
    supabase
      .from("lesson_overrides")
      .select("*")
      .eq("organization_id", organization.id)
      .or(`lesson_date.eq.${effDate},new_date.eq.${effDate}`),
  ]);

  const conflicts = findScheduleConflicts({
    courses: (allCourses || []) as unknown as Array<ScheduleCourse & { name: string }>,
    // Drop our own stored override so it doesn't shadow the proposed values
    overrides: ((dayOverrides || []) as LessonOverride[]).filter(
      (o) =>
        !(
          o.course_id === course.id &&
          o.lesson_date === input.originalDate &&
          normTime(o.original_start_time) === originalStart
        )
    ),
    date: effDate,
    startTime: effStart,
    duration: effDuration,
    teacherId: timeChanged || teacherChanged ? effTeacher : null,
    roomId: timeChanged ? course.room_id : null,
    self: {
      courseId: course.id,
      originalDate: input.originalDate,
      originalStartTime: originalStart,
    },
  });

  if (conflicts.length > 0) {
    const first = conflicts[0];
    return {
      errorCode: first.kind === "teacher" ? "teacherBusy" : "roomBusy",
      detail: conflictDetail(first),
    };
  }

  const user = await getCurrentUser();

  const { error } = await supabase.from("lesson_overrides").upsert(
    {
      organization_id: organization.id,
      course_id: course.id,
      lesson_date: input.originalDate,
      original_start_time: originalStart,
      new_date: newDate,
      new_start_time: newStart,
      new_duration: newDuration,
      new_teacher_id: newTeacher,
      original_teacher_id: course.teacher_id,
      reason: input.reason?.trim() || null,
      created_by: user?.id ?? null,
    },
    { onConflict: "course_id,lesson_date,original_start_time" }
  );

  if (error) return { errorCode: "db", detail: error.message };

  revalidateSchedulePaths();
  return { success: true };
}

/** Remove the override of one occurrence -> it falls back to the course template. */
export async function resetLessonOverride(
  courseId: string,
  originalDate: string,
  originalStartTime: string
): Promise<OverrideActionState> {
  if (!(await requireAdmin())) return { errorCode: "forbidden" };
  if (!courseId || !DATE_RE.test(originalDate) || !TIME_RE.test(originalStartTime)) {
    return { errorCode: "invalid" };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { errorCode: "forbidden" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_overrides")
    .delete()
    .eq("organization_id", organization.id)
    .eq("course_id", courseId)
    .eq("lesson_date", originalDate)
    .eq("original_start_time", normTime(originalStartTime));

  if (error) return { errorCode: "db", detail: error.message };

  revalidateSchedulePaths();
  return { success: true };
}
