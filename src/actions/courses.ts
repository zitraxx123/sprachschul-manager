"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type CourseActionState = {
  error?: string;
  success?: boolean;
};

export type ScheduleInput = {
  day_of_week: string;
  start_time: string;
  duration: number;
};

export async function createCourse(
  prevState: CourseActionState | null,
  formData: FormData
): Promise<CourseActionState> {
  const name = (formData.get("name") as string)?.trim();
  const teacherId = (formData.get("teacher_id") as string)?.trim() || null;
  const roomId = (formData.get("room_id") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const courseTypeRaw = (formData.get("course_type") as string)?.trim();
  const courseType: "group" | "individual" = courseTypeRaw === "individual" ? "individual" : "group";

  if (!name) {
    return { error: "Bitte geben Sie einen Kursnamen ein." };
  }

  let schedules: ScheduleInput[] = [];
  const schedulesRaw = formData.get("schedules_json") as string;
  if (schedulesRaw) {
    try {
      schedules = JSON.parse(schedulesRaw);
    } catch {
      return { error: "Ungültiges Format für den Stundenplan." };
    }
  }

  if (!schedules || schedules.length === 0) {
    return { error: "Bitte fügen Sie mindestens einen Unterrichtstag zum Stundenplan hinzu." };
  }

  for (const s of schedules) {
    if (!s.day_of_week) {
      return { error: "Bitte für jeden Termin einen Wochentag auswählen." };
    }
    if (!s.start_time) {
      return { error: "Bitte für jeden Termin eine Startzeit angeben." };
    }
    if (!s.duration || s.duration <= 0) {
      return { error: "Bitte für jeden Termin eine gültige Dauer angeben." };
    }
  }

  let studentIds: string[] = [];
  const studentIdsRaw = formData.get("student_ids_json") as string;
  if (studentIdsRaw) {
    try {
      studentIds = JSON.parse(studentIdsRaw);
    } catch {
      studentIds = [];
    }
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden." };
  }

  const supabase = await createClient();

  const { data: newCourse, error: cErr } = await supabase
    .from("courses")
    .insert({
      organization_id: organization.id,
      name,
      teacher_id: teacherId,
      room_id: roomId,
      course_type: courseType,
      description: description || null,
    })
    .select("id")
    .single();

  if (cErr || !newCourse) {
    return { error: `Fehler beim Erstellen des Kurses: ${cErr?.message}` };
  }

  const scheduleInserts = schedules.map((s) => ({
    course_id: newCourse.id,
    organization_id: organization.id,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    duration: Number(s.duration),
  }));

  const { error: sErr } = await supabase.from("course_schedules").insert(scheduleInserts);
  if (sErr) {
    return { error: `Fehler beim Speichern des Stundenplans: ${sErr.message}` };
  }

  // Assign students if any were selected during course creation
  if (studentIds.length > 0) {
    const studentCourseInserts = studentIds.map((sId) => ({
      organization_id: organization.id,
      course_id: newCourse.id,
      student_id: sId,
    }));
    await supabase.from("student_courses").insert(studentCourseInserts);
  }

  revalidatePath("/courses");
  revalidatePath("/my-portal");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function updateCourse(
  prevState: CourseActionState | null,
  formData: FormData
): Promise<CourseActionState> {
  const courseId = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const teacherId = (formData.get("teacher_id") as string)?.trim() || null;
  const roomId = (formData.get("room_id") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const courseTypeRaw = (formData.get("course_type") as string)?.trim();
  const courseType: "group" | "individual" = courseTypeRaw === "individual" ? "individual" : "group";

  if (!courseId) {
    return { error: "Kurs-ID fehlt." };
  }
  if (!name) {
    return { error: "Bitte geben Sie einen Kursnamen ein." };
  }

  let schedules: ScheduleInput[] = [];
  const schedulesRaw = formData.get("schedules_json") as string;
  if (schedulesRaw) {
    try {
      schedules = JSON.parse(schedulesRaw);
    } catch {
      return { error: "Ungültiges Format für den Stundenplan." };
    }
  }

  if (!schedules || schedules.length === 0) {
    return { error: "Bitte fügen Sie mindestens einen Unterrichtstag zum Stundenplan hinzu." };
  }

  for (const s of schedules) {
    if (!s.day_of_week) {
      return { error: "Bitte für jeden Termin einen Wochentag auswählen." };
    }
    if (!s.start_time) {
      return { error: "Bitte für jeden Termin eine Startzeit angeben." };
    }
    if (!s.duration || s.duration <= 0) {
      return { error: "Bitte für jeden Termin eine gültige Dauer angeben." };
    }
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden." };
  }

  const supabase = await createClient();

  const { error: cErr } = await supabase
    .from("courses")
    .update({
      name,
      teacher_id: teacherId,
      room_id: roomId,
      course_type: courseType,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId)
    .eq("organization_id", organization.id);

  if (cErr) {
    return { error: `Fehler beim Aktualisieren des Kurses: ${cErr.message}` };
  }

  // Delete old schedules
  const { error: delErr } = await supabase
    .from("course_schedules")
    .delete()
    .eq("course_id", courseId)
    .eq("organization_id", organization.id);

  if (delErr) {
    return { error: `Fehler beim Aktualisieren des Stundenplans: ${delErr.message}` };
  }

  // Insert new schedules
  const scheduleInserts = schedules.map((s) => ({
    course_id: courseId,
    organization_id: organization.id,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    duration: Number(s.duration),
  }));

  const { error: sErr } = await supabase.from("course_schedules").insert(scheduleInserts);
  if (sErr) {
    return { error: `Fehler beim Speichern der neuen Unterrichtszeiten: ${sErr.message}` };
  }

  // Sync assigned students if provided in formData
  const studentIdsRaw = formData.get("student_ids_json") as string;
  if (studentIdsRaw !== null && studentIdsRaw !== undefined) {
    try {
      const studentIds: string[] = JSON.parse(studentIdsRaw);
      await updateCourseStudents(courseId, studentIds);
    } catch {
      // Ignore JSON parse errors for optional students payload
    }
  }

  revalidatePath("/courses");
  revalidatePath("/my-portal");
  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function deleteCourse(courseId: string) {
  const organization = await getActiveOrganization();
  if (!organization) throw new Error("Nicht autorisiert.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/courses");
  revalidatePath("/my-portal");
  revalidatePath("/students");
}

export async function updateCourseStudents(
  courseId: string,
  studentIds: string[]
): Promise<CourseActionState> {
  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();

  // 1. Fetch course info
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .eq("organization_id", organization.id)
    .single();

  if (cErr || !course) {
    return { error: "Kurs nicht gefunden." };
  }

  // 2. Fetch all currently assigned students for this course in student_courses
  const { data: currentLinks, error: fetchErr } = await supabase
    .from("student_courses")
    .select("student_id")
    .eq("course_id", courseId)
    .eq("organization_id", organization.id);

  if (fetchErr) {
    return { error: `Fehler beim Abrufen der aktuellen Zuweisungen: ${fetchErr.message}` };
  }

  const currentStudentIds = (currentLinks || []).map((l) => l.student_id);
  const toRemove = currentStudentIds.filter((id) => !studentIds.includes(id));
  const toAdd = studentIds.filter((id) => !currentStudentIds.includes(id));

  // 3. Remove student_courses rows for deselected students
  if (toRemove.length > 0) {
    const { error: unassignErr } = await supabase
      .from("student_courses")
      .delete()
      .eq("course_id", courseId)
      .eq("organization_id", organization.id)
      .in("student_id", toRemove);

    if (unassignErr) {
      return { error: `Fehler beim Entfernen von Schülern: ${unassignErr.message}` };
    }
  }

  // 4. Add student_courses rows for newly selected students
  if (toAdd.length > 0) {
    const inserts = toAdd.map((studentId) => ({
      organization_id: organization.id,
      course_id: courseId,
      student_id: studentId,
    }));

    const { error: assignErr } = await supabase
      .from("student_courses")
      .insert(inserts);

    if (assignErr) {
      return { error: `Fehler beim Zuweisen der Schüler: ${assignErr.message}` };
    }
  }

  revalidatePath("/courses");
  revalidatePath("/students");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");

  return { success: true };
}
