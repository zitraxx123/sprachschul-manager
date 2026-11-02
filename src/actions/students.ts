"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type StudentActionState = {
  error?: string;
  success?: boolean;
};

export async function createStudent(
  prevState: StudentActionState | null,
  formData: FormData
): Promise<StudentActionState> {
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const parentName = (formData.get("parent_name") as string)?.trim() || null;
  const parentPhone = (formData.get("parent_phone") as string)?.trim() || null;
  const parentEmail = (formData.get("parent_email") as string)?.trim().toLowerCase() || null;
  const courseIds = (formData.getAll("course_ids") as string[]).filter(Boolean);
  const legacyCourseId = (formData.get("course_id") as string)?.trim();
  if (legacyCourseId && !courseIds.includes(legacyCourseId)) {
    courseIds.push(legacyCourseId);
  }
  const courseName = (formData.get("course_name") as string)?.trim() || null;
  const customMonthlyPriceRaw = (formData.get("custom_monthly_price") as string)?.trim();
  let customMonthlyPrice: number | null = null;
  if (customMonthlyPriceRaw !== undefined && customMonthlyPriceRaw !== "") {
    const parsed = parseFloat(customMonthlyPriceRaw.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      customMonthlyPrice = parsed;
    }
  }

  if (!firstName || !lastName) {
    return { error: "Vor- und Nachname des Schülers sind erforderlich." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden." };
  }

  const supabase = await createClient();

  // 1. Insert student row
  const { data: student, error: sErr } = await supabase
    .from("students")
    .insert({
      organization_id: organization.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      course_name: courseName,
      custom_monthly_price: customMonthlyPrice,
    })
    .select("id")
    .single();

  if (sErr || !student) {
    return { error: `Fehler beim Erstellen des Schülers: ${sErr?.message}` };
  }

  // 2. Link student to selected courses in student_courses
  if (courseIds.length > 0) {
    const links = courseIds.map((courseId) => ({
      organization_id: organization.id,
      student_id: student.id,
      course_id: courseId,
    }));

    const { error: scErr } = await supabase.from("student_courses").insert(links);
    if (scErr) {
      console.error("Error creating student_courses links:", scErr);
    }
  }

  revalidatePath("/students");
  revalidatePath("/courses");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStudent(
  prevState: StudentActionState | null,
  formData: FormData
): Promise<StudentActionState> {
  const studentId = (formData.get("student_id") as string)?.trim();
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const parentName = (formData.get("parent_name") as string)?.trim() || null;
  const parentPhone = (formData.get("parent_phone") as string)?.trim() || null;
  const parentEmail = (formData.get("parent_email") as string)?.trim().toLowerCase() || null;
  const courseIds = (formData.getAll("course_ids") as string[]).filter(Boolean);
  const legacyCourseId = (formData.get("course_id") as string)?.trim();
  if (legacyCourseId && !courseIds.includes(legacyCourseId)) {
    courseIds.push(legacyCourseId);
  }
  const courseName = (formData.get("course_name") as string)?.trim() || null;
  const customMonthlyPriceRaw = (formData.get("custom_monthly_price") as string)?.trim();
  let customMonthlyPrice: number | null = null;
  if (customMonthlyPriceRaw !== undefined && customMonthlyPriceRaw !== "") {
    const parsed = parseFloat(customMonthlyPriceRaw.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) {
      customMonthlyPrice = parsed;
    }
  }

  if (!studentId) {
    return { error: "Ungültige Schüler-ID." };
  }

  if (!firstName || !lastName) {
    return { error: "Vor- und Nachname des Schülers sind erforderlich." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden." };
  }

  const supabase = await createClient();

  // 1. Update personal details
  const { error: sErr } = await supabase
    .from("students")
    .update({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      parent_name: parentName,
      parent_phone: parentPhone,
      parent_email: parentEmail,
      course_name: courseName,
      custom_monthly_price: customMonthlyPrice,
    })
    .eq("id", studentId)
    .eq("organization_id", organization.id);

  if (sErr) {
    return { error: `Fehler beim Bearbeiten des Schülers: ${sErr.message}` };
  }

  // 2. Synchronize student_courses links
  const { data: currentLinks } = await supabase
    .from("student_courses")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("organization_id", organization.id);

  const currentCourseIds = (currentLinks || []).map((l) => l.course_id);
  const toRemove = currentCourseIds.filter((id) => !courseIds.includes(id));
  const toAdd = courseIds.filter((id) => !currentCourseIds.includes(id));

  if (toRemove.length > 0) {
    await supabase
      .from("student_courses")
      .delete()
      .eq("student_id", studentId)
      .eq("organization_id", organization.id)
      .in("course_id", toRemove);
  }

  if (toAdd.length > 0) {
    const inserts = toAdd.map((courseId) => ({
      organization_id: organization.id,
      student_id: studentId,
      course_id: courseId,
    }));
    await supabase.from("student_courses").insert(inserts);
  }

  revalidatePath("/students");
  revalidatePath("/courses");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStudent(studentId: string) {
  const organization = await getActiveOrganization();
  if (!organization) throw new Error("Nicht autorisiert.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/students");
  revalidatePath("/courses");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
}

export type CsvImportStudent = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  course?: string | null;
};

export async function importStudents(
  rows: CsvImportStudent[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const organization = await getActiveOrganization();
    if (!organization) {
      return { success: false, error: "Keine aktive Sprachschule gefunden." };
    }

    if (!rows || rows.length === 0) {
      return { success: false, error: "Keine Schülerdaten zum Importieren gefunden." };
    }

    const supabase = await createClient();

    // 1. Fetch existing courses to map course name -> course id
    const { data: existingCourses } = await supabase
      .from("courses")
      .select("id, name")
      .eq("organization_id", organization.id);

    const courseMap = new Map<string, string>();
    (existingCourses || []).forEach((c) => {
      if (c.name) {
        courseMap.set(c.name.trim().toLowerCase(), c.id);
      }
    });

    // 2. Identify missing courses that need to be auto-created
    const uniqueCourseNames = Array.from(
      new Set(
        rows
          .map((r) => r.course?.trim())
          .filter((name): name is string => Boolean(name && name.length > 0))
      )
    );

    for (const name of uniqueCourseNames) {
      const lower = name.toLowerCase();
      if (!courseMap.has(lower)) {
        const { data: newCourse, error: cErr } = await supabase
          .from("courses")
          .insert({
            organization_id: organization.id,
            name: name,
            course_type: "group",
          })
          .select("id, name")
          .single();

        if (!cErr && newCourse) {
          courseMap.set(lower, newCourse.id);
        }
      }
    }

    // 3. Process students in batches or sequential inserts
    let importedCount = 0;
    const studentCourseInserts: Array<{
      organization_id: string;
      student_id: string;
      course_id: string;
    }> = [];

    for (const row of rows) {
      const firstName = row.first_name?.trim();
      const lastName = row.last_name?.trim();
      if (!firstName || !lastName) continue;

      const email = row.email?.trim().toLowerCase() || null;
      const phone = row.phone?.trim() || null;
      const courseName = row.course?.trim() || null;

      const { data: student, error: sErr } = await supabase
        .from("students")
        .insert({
          organization_id: organization.id,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          course_name: courseName,
        })
        .select("id")
        .single();

      if (sErr || !student) {
        console.error("Failed to insert student during CSV import:", sErr);
        continue;
      }

      importedCount++;

      // If course name is specified, link via student_courses
      if (courseName) {
        const courseId = courseMap.get(courseName.toLowerCase());
        if (courseId) {
          studentCourseInserts.push({
            organization_id: organization.id,
            student_id: student.id,
            course_id: courseId,
          });
        }
      }
    }

    // 4. Batch insert student_courses mappings
    if (studentCourseInserts.length > 0) {
      const { error: scErr } = await supabase
        .from("student_courses")
        .insert(studentCourseInserts);
      if (scErr) {
        console.error("Failed to link student_courses in CSV import:", scErr);
      }
    }

    revalidatePath("/students");
    revalidatePath("/courses");
    revalidatePath("/my-portal");
    revalidatePath("/lessons");
    revalidatePath("/dashboard");

    return { success: true, count: importedCount };
  } catch (err: unknown) {
    console.error("Error in importStudents:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unerwarteter Fehler beim Importieren.",
    };
  }
}
