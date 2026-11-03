"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";
import { planLimitError } from "@/lib/plan-limits";

export type TeacherActionState = {
  error?: string;
  success?: boolean;
};

function parseOptionalRate(value: FormDataEntryValue | null): number | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = parseFloat(str.replace(",", "."));
  return isNaN(num) || num < 0 ? null : num;
}

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

const EMPLOYMENT_TYPES = ["honorar", "minijob", "teilzeit"] as const;
type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

function parseEmploymentType(value: FormDataEntryValue | null): EmploymentType {
  const str = String(value || "").trim();
  return (EMPLOYMENT_TYPES as readonly string[]).includes(str) ? (str as EmploymentType) : "honorar";
}

export async function createTeacher(
  prevState: TeacherActionState | null,
  formData: FormData
): Promise<TeacherActionState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const birthday = parseGermanOrIsoDate(formData.get("birthday"));
  const hourlyRateRaw = formData.get("hourly_rate") as string;

  if (!name) {
    return { error: "Der Name der Lehrkraft ist erforderlich." };
  }

  const hourlyRate = parseFloat(hourlyRateRaw?.replace(",", "."));
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return { error: "Bitte geben Sie einen gültigen Basissatz ein (z. B. 35.00)." };
  }

  const rateGroup = parseOptionalRate(formData.get("rate_group"));
  const rateIndividual = parseOptionalRate(formData.get("rate_individual"));
  const rate45 = parseOptionalRate(formData.get("rate_45"));
  const rate60 = parseOptionalRate(formData.get("rate_60"));
  const rate90 = parseOptionalRate(formData.get("rate_90"));
  const employmentType = parseEmploymentType(formData.get("employment_type"));
  const taxId = ((formData.get("tax_id") as string | null) || "").replace(/\s+/g, "") || null;

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden. Bitte erneut anmelden." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("teachers").insert({
    organization_id: organization.id,
    name,
    email,
    phone,
    birthday,
    hourly_rate: hourlyRate,
    rate_group: rateGroup,
    rate_individual: rateIndividual,
    rate_45: rate45,
    rate_60: rate60,
    rate_90: rate90,
    employment_type: employmentType,
    tax_id: taxId,
  });

  if (error) {
    const limit = planLimitError(error.message);
    if (limit) return { error: limit };
    return { error: `Fehler beim Erstellen: ${error.message}` };
  }

  revalidatePath("/teachers");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateTeacher(
  prevState: TeacherActionState | null,
  formData: FormData
): Promise<TeacherActionState> {
  const teacherId = formData.get("teacher_id") as string;
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const birthday = parseGermanOrIsoDate(formData.get("birthday"));
  const hourlyRateRaw = formData.get("hourly_rate") as string;

  if (!teacherId) {
    return { error: "Keine Lehrkraft-ID angegeben." };
  }

  if (!name) {
    return { error: "Der Name der Lehrkraft ist erforderlich." };
  }

  const hourlyRate = parseFloat(hourlyRateRaw?.replace(",", "."));
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return { error: "Bitte geben Sie einen gültigen Basissatz ein (z. B. 35.00)." };
  }

  const rateGroup = parseOptionalRate(formData.get("rate_group"));
  const rateIndividual = parseOptionalRate(formData.get("rate_individual"));
  const rate45 = parseOptionalRate(formData.get("rate_45"));
  const rate60 = parseOptionalRate(formData.get("rate_60"));
  const rate90 = parseOptionalRate(formData.get("rate_90"));
  const employmentType = parseEmploymentType(formData.get("employment_type"));
  const taxId = ((formData.get("tax_id") as string | null) || "").replace(/\s+/g, "") || null;

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Nicht autorisiert." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("teachers")
    .update({
      name,
      email,
      phone,
      birthday,
      hourly_rate: hourlyRate,
      rate_group: rateGroup,
      rate_individual: rateIndividual,
      rate_45: rate45,
      rate_60: rate60,
      rate_90: rate90,
      employment_type: employmentType,
      tax_id: taxId,
    })
    .eq("id", teacherId)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: `Fehler beim Aktualisieren: ${error.message}` };
  }

  revalidatePath("/teachers");
  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  return { success: true };
}

export async function deleteTeacher(teacherId: string) {
  const organization = await getActiveOrganization();
  if (!organization) throw new Error("Nicht autorisiert.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", teacherId)
    .eq("organization_id", organization.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/teachers");
  revalidatePath("/dashboard");
  revalidatePath("/lessons");
}
