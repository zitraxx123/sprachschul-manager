"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type AttendanceItem = {
  student_id: string;
  status: "present" | "absent";
};

export type RecordLessonState = {
  error?: string;
  success?: boolean;
};

export async function recordCourseLesson(
  courseId: string,
  lessonDate: string,
  attendances: AttendanceItem[],
  notes?: string,
  durationHoursParam?: number,
  status: "completed" | "cancelled_by_student" | "cancelled_late" = "completed"
): Promise<RecordLessonState> {
  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine Organisation gefunden." };

  const supabase = await createClient();

  // 1. Fetch course details
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("*, teachers(*)")
    .eq("id", courseId)
    .eq("organization_id", organization.id)
    .single();

  if (cErr || !course) {
    return { error: "Kurs nicht gefunden." };
  }

  const teacherId = course.teacher_id;
  if (!teacherId) {
    return { error: "Dem Kurs ist keine Lehrkraft zugewiesen." };
  }

  let durationHours = durationHoursParam && durationHoursParam > 0 ? durationHoursParam : 0;
  if (!durationHours) {
    const { data: schedules } = await supabase
      .from("course_schedules")
      .select("duration")
      .eq("course_id", courseId)
      .limit(1);
    durationHours = Number(schedules?.[0]?.duration || 1.5);
  }
  const presentCount = attendances.filter((a) => a.status === "present").length;

  const defaultNotes = status !== "completed"
    ? `Kurs: ${course.name} (${status === "cancelled_late" ? "Spätstornierung" : "Rechtzeitige Stornierung"})`
    : `Kurs: ${course.name} (${presentCount} anwesend, ${attendances.length - presentCount} abwesend)`;

  // 2. Insert Lesson for teacher payroll
  const { data: lesson, error: lErr } = await supabase
    .from("lessons")
    .insert({
      organization_id: organization.id,
      teacher_id: teacherId,
      course_id: course.id,
      student_name: course.name,
      lesson_date: lessonDate,
      duration_hours: durationHours,
      notes: notes || defaultNotes,
      status: status || "completed",
    })
    .select("id")
    .single();

  if (lErr || !lesson) {
    return { error: `Fehler beim Erfassen der Unterrichtsstunde: ${lErr?.message}` };
  }

  // 3. Record Attendance entries (student subscription payment is not modified)
  if (attendances.length > 0) {
    const attendanceInserts = attendances.map((a) => ({
      organization_id: organization.id,
      lesson_id: lesson.id,
      student_id: a.student_id,
      status: a.status,
    }));

    const { error: aErr } = await supabase.from("attendance").insert(attendanceInserts);
    if (aErr) {
      console.error("Attendance insert error:", aErr);
    }
  }

  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/students");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: true };
}
