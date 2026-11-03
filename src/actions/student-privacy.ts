"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";

export type PrivacyResult = {
  /** i18n key under "students" */
  error?: string;
  filename?: string;
  json?: string;
  success?: boolean;
};

async function requireAdminOrg() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization || !membership || !["owner", "admin"].includes(membership.role)) return null;
  return organization;
}

/** DSGVO Art. 15/20: all stored data about one student as a JSON document. */
export async function exportStudentData(studentId: string): Promise<PrivacyResult> {
  const organization = await requireAdminOrg();
  if (!organization) return { error: "privacyErrorForbidden" };

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!student) return { error: "privacyErrorNotFound" };

  const byStudent = (table: "student_courses" | "monthly_payments" | "invoices" | "student_sepa_mandates" | "attendance" | "lessons") =>
    supabase.from(table).select("*").eq("student_id", studentId).eq("organization_id", organization.id);

  const [enrollments, payments, invoices, mandate, attendance, lessons] = await Promise.all([
    supabase
      .from("student_courses")
      .select("*, courses(name)")
      .eq("student_id", studentId)
      .eq("organization_id", organization.id),
    byStudent("monthly_payments"),
    byStudent("invoices"),
    byStudent("student_sepa_mandates"),
    byStudent("attendance"),
    byStudent("lessons"),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    school: organization.name,
    student,
    enrollments: enrollments.data || [],
    monthly_payments: payments.data || [],
    invoices: invoices.data || [],
    sepa_mandate: mandate.data || [],
    attendance: attendance.data || [],
    individual_lessons: lessons.data || [],
  };

  const safeName = `${student.last_name}-${student.first_name}`.replace(/[^A-Za-z0-9-]+/g, "_");
  return {
    filename: `dsgvo-export-${safeName}-${student.id.slice(0, 8)}.json`,
    json: JSON.stringify(payload, null, 2),
  };
}

/**
 * DSGVO Art. 17: removes personal data but keeps what must be retained by tax law:
 * invoices and payment records stay (retention duty, GoBD). The student row is kept as an
 * anonymous placeholder so that lesson statistics and payroll stay consistent.
 */
export async function anonymizeStudent(studentId: string): Promise<PrivacyResult> {
  const organization = await requireAdminOrg();
  if (!organization) return { error: "privacyErrorForbidden" };

  const supabase = await createClient();
  const label = "Gelöscht";

  const { data: updated, error } = await supabase
    .from("students")
    .update({
      first_name: label,
      last_name: `#${studentId.slice(0, 8)}`,
      email: null,
      phone: null,
      parent_name: null,
      parent_phone: null,
      parent_email: null,
    })
    .eq("id", studentId)
    .eq("organization_id", organization.id)
    .select("id");

  if (error) return { error: "privacyErrorFailed" };
  if (!updated || updated.length === 0) return { error: "privacyErrorNotFound" };

  // Bank data is not needed any more
  await supabase.from("student_sepa_mandates").delete().eq("student_id", studentId).eq("organization_id", organization.id);
  // Name copy and free-text notes on individual lessons
  await supabase
    .from("lessons")
    .update({ student_name: label, notes: null })
    .eq("student_id", studentId)
    .eq("organization_id", organization.id);

  revalidatePath("/students");
  revalidatePath("/lessons");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  return { success: true };
}
