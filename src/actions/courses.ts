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

export type StudentAssignmentInput = {
  studentId: string;
  status: "active" | "trial" | "waiting";
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
  const maxCapacityRaw = (formData.get("max_capacity") as string)?.trim();
  const parsedCapacity = maxCapacityRaw ? parseInt(maxCapacityRaw, 10) : 10;
  const maxCapacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 10 : parsedCapacity;

  const monthlyPriceRaw = (formData.get("monthly_price") as string)?.trim();
  const parsedMonthlyPrice = monthlyPriceRaw ? parseFloat(monthlyPriceRaw.replace(",", ".")) : 0;
  const monthlyPrice = isNaN(parsedMonthlyPrice) || parsedMonthlyPrice < 0 ? 0 : parsedMonthlyPrice;

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
      max_capacity: maxCapacity,
      monthly_price: monthlyPrice,
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
  let assignments: StudentAssignmentInput[] = [];
  const assignmentsRaw = formData.get("student_assignments_json") as string;
  if (assignmentsRaw) {
    try {
      assignments = JSON.parse(assignmentsRaw);
    } catch {
      assignments = [];
    }
  }

  if (assignments.length > 0) {
    await updateCourseStudents(newCourse.id, assignments);
  } else if (studentIds.length > 0) {
    await updateCourseStudents(newCourse.id, studentIds);
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
  const courseId =
    (formData.get("course_id") as string)?.trim() ||
    (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const teacherId = (formData.get("teacher_id") as string)?.trim() || null;
  const roomId = (formData.get("room_id") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const courseTypeRaw = (formData.get("course_type") as string)?.trim();
  const courseType: "group" | "individual" = courseTypeRaw === "individual" ? "individual" : "group";
  const maxCapacityRaw = (formData.get("max_capacity") as string)?.trim();
  const parsedCapacity = maxCapacityRaw ? parseInt(maxCapacityRaw, 10) : 10;
  const maxCapacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 10 : parsedCapacity;

  const monthlyPriceRaw = (formData.get("monthly_price") as string)?.trim();
  const parsedMonthlyPrice = monthlyPriceRaw ? parseFloat(monthlyPriceRaw.replace(",", ".")) : 0;
  const monthlyPrice = isNaN(parsedMonthlyPrice) || parsedMonthlyPrice < 0 ? 0 : parsedMonthlyPrice;

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
      max_capacity: maxCapacity,
      monthly_price: monthlyPrice,
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
  const studentAssignmentsRaw = formData.get("student_assignments_json") as string;
  const studentIdsRaw = formData.get("student_ids_json") as string;
  if (studentAssignmentsRaw) {
    try {
      const assignments: StudentAssignmentInput[] = JSON.parse(studentAssignmentsRaw);
      await updateCourseStudents(courseId, assignments);
    } catch {
      // Ignore JSON parse errors for optional students payload
    }
  } else if (studentIdsRaw !== null && studentIdsRaw !== undefined) {
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
  assignmentsOrIds: StudentAssignmentInput[] | string[]
): Promise<CourseActionState> {
  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();

  // Normalize assignments input
  const assignments: StudentAssignmentInput[] = (assignmentsOrIds || []).map((item) => {
    if (typeof item === "string") {
      return { studentId: item, status: "active" as const };
    }
    return {
      studentId: item.studentId,
      status: item.status === "trial" || item.status === "waiting" ? item.status : ("active" as const),
    };
  });

  // 1. Fetch course info with capacity limit
  const { data: course, error: cErr } = await supabase
    .from("courses")
    .select("id, name, max_capacity")
    .eq("id", courseId)
    .eq("organization_id", organization.id)
    .single();

  if (cErr || !course) {
    return { error: "Kurs nicht gefunden." };
  }

  // Enforce capacity rule for 'active' students
  const maxCapacity = course.max_capacity || 10;
  const activeCount = assignments.filter((a) => a.status === "active").length;
  if (activeCount > maxCapacity) {
    return {
      error: `Die maximale Teilnehmerzahl von ${maxCapacity} aktiven Schülern ist erreicht (aktuell: ${activeCount}). Bitte weisen Sie Schüler der Warteliste zu.`,
    };
  }

  // 2. Fetch all currently assigned students for this course in student_courses
  const { data: currentLinks, error: fetchErr } = await supabase
    .from("student_courses")
    .select("id, student_id, status")
    .eq("course_id", courseId)
    .eq("organization_id", organization.id);

  if (fetchErr) {
    return { error: `Fehler beim Abrufen der aktuellen Zuweisungen: ${fetchErr.message}` };
  }

  const currentLinksMap = new Map((currentLinks || []).map((l) => [l.student_id, l]));
  const currentStudentIds = Array.from(currentLinksMap.keys());
  const targetStudentIds = assignments.map((a) => a.studentId);

  const toRemove = currentStudentIds.filter((id) => !targetStudentIds.includes(id));
  const toAdd = assignments.filter((a) => !currentStudentIds.includes(a.studentId));
  const toUpdate = assignments.filter((a) => {
    const existing = currentLinksMap.get(a.studentId);
    return existing && existing.status !== a.status;
  });

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

  // 4. Add student_courses rows for newly selected students with their specified status
  if (toAdd.length > 0) {
    const inserts = toAdd.map((item) => ({
      organization_id: organization.id,
      course_id: courseId,
      student_id: item.studentId,
      status: item.status,
    }));

    const { error: assignErr } = await supabase
      .from("student_courses")
      .insert(inserts);

    if (assignErr) {
      return { error: `Fehler beim Zuweisen der Schüler: ${assignErr.message}` };
    }
  }

  // 5. Update status for existing students if status changed
  for (const item of toUpdate) {
    const { error: updateStatusErr } = await supabase
      .from("student_courses")
      .update({ status: item.status })
      .eq("course_id", courseId)
      .eq("student_id", item.studentId)
      .eq("organization_id", organization.id);

    if (updateStatusErr) {
      console.error("Error updating student_courses status:", updateStatusErr);
    }
  }

  revalidatePath("/courses");
  revalidatePath("/students");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");

  return { success: true };
}
