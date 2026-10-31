"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type TeacherActionState = {
  error?: string;
  success?: boolean;
};

export async function createTeacher(
  prevState: TeacherActionState | null,
  formData: FormData
): Promise<TeacherActionState> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const hourlyRateRaw = formData.get("hourly_rate") as string;

  if (!name) {
    return { error: "Der Name der Lehrkraft ist erforderlich." };
  }

  const hourlyRate = parseFloat(hourlyRateRaw);
  if (isNaN(hourlyRate) || hourlyRate < 0) {
    return { error: "Bitte geben Sie einen gültigen Stundensatz ein (z. B. 30.00)." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine aktive Sprachschule gefunden. Bitte erneut anmelden." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("teachers").insert({
    organization_id: organization.id,
    name,
    email,
    hourly_rate: hourlyRate,
  });

  if (error) {
    return { error: `Fehler beim Erstellen: ${error.message}` };
  }

  revalidatePath("/teachers");
  revalidatePath("/dashboard");
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
