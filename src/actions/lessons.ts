"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type LessonActionState = {
  error?: string;
  success?: boolean;
};

function parseGermanOrIsoDate(value: FormDataEntryValue | null): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const [d, m, y] = str.split(".");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  return null;
}

export async function createLesson(
  prevState: LessonActionState | null,
  formData: FormData
): Promise<LessonActionState> {
  const teacherId = formData.get("teacher_id") as string;
  const studentId = (formData.get("student_id") as string)?.trim() || null;
  const lessonDateRaw = formData.get("lesson_date");
  const lessonDate = parseGermanOrIsoDate(lessonDateRaw);
  const durationRaw = formData.get("duration_hours") as string;
  let studentName = (formData.get("student_name") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!teacherId) {
    return { error: "Bitte wählen Sie eine Lehrkraft aus." };
  }

  if (!lessonDate) {
    return { error: "Bitte geben Sie das Unterrichtsdatum an." };
  }

  const durationHours = parseFloat(durationRaw);
  if (isNaN(durationHours) || durationHours <= 0) {
    return { error: "Bitte geben Sie eine gültige Dauer in Stunden an (z. B. 1.5 für 90 Min.)." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Organisation gefunden." };
  }

  const supabase = await createClient();

  // If a student is selected from DB, fill course/student name if not provided
  if (studentId && !studentName) {
    const { data: student } = await supabase
      .from("students")
      .select("first_name, last_name, course_name")
      .eq("id", studentId)
      .eq("organization_id", organization.id)
      .maybeSingle();

    if (student) {
      studentName = student.course_name || `${student.first_name} ${student.last_name}`;
    }
  }

  const { error } = await supabase.from("lessons").insert({
    organization_id: organization.id,
    teacher_id: teacherId,
    student_id: studentId,
    student_name: studentName,
    lesson_date: lessonDate,
    duration_hours: durationHours,
    notes,
  });

  if (error) {
    return { error: `Fehler beim Speichern: ${error.message}` };
  }

  revalidatePath("/lessons");
  revalidatePath("/students");
  revalidatePath("/teachers");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLesson(lessonId: string) {
  const organization = await getActiveOrganization();
  if (!organization) throw new Error("Nicht autorisiert.");

  const supabase = await createClient();

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/lessons");
  revalidatePath("/students");
  revalidatePath("/teachers");
  revalidatePath("/dashboard");
}
