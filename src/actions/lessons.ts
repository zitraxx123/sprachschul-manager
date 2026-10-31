"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type LessonActionState = {
  error?: string;
  success?: boolean;
};

export async function createLesson(
  prevState: LessonActionState | null,
  formData: FormData
): Promise<LessonActionState> {
  const teacherId = formData.get("teacher_id") as string;
  const lessonDate = formData.get("lesson_date") as string;
  const durationRaw = formData.get("duration_hours") as string;
  const studentName = (formData.get("student_name") as string)?.trim() || null;
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

  const { error } = await supabase.from("lessons").insert({
    organization_id: organization.id,
    teacher_id: teacherId,
    lesson_date: lessonDate,
    duration_hours: durationHours,
    student_name: studentName,
    notes,
  });

  if (error) {
    return { error: `Fehler beim Speichern: ${error.message}` };
  }

  revalidatePath("/lessons");
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
  revalidatePath("/teachers");
  revalidatePath("/dashboard");
}
