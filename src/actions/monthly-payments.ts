"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type MonthlyPaymentActionState = {
  error?: string;
  success?: boolean;
};

export async function recordMonthlyPayment(
  prevState: MonthlyPaymentActionState | null,
  formData: FormData
): Promise<MonthlyPaymentActionState> {
  const studentId = formData.get("student_id") as string;
  const monthYear = (formData.get("month_year") as string)?.trim();
  const amountEuroRaw = formData.get("amount_euro") as string;
  const isPaid = formData.get("is_paid") === "true" || formData.get("is_paid") === "on";

  if (!studentId) {
    return { error: "Kein Schüler angegeben." };
  }

  if (!monthYear) {
    return { error: "Bitte geben Sie den Abrechnungsmonat an (z. B. 2026-10)." };
  }

  const amountEuro = parseFloat((amountEuroRaw || "0").replace(",", "."));
  if (isNaN(amountEuro) || amountEuro < 0) {
    return { error: "Bitte geben Sie einen gültigen Betrag in Euro an." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine Organisation gefunden." };
  }

  const supabase = await createClient();

  // Upsert record for student and month_year
  const { error } = await supabase
    .from("monthly_payments")
    .upsert(
      {
        organization_id: organization.id,
        student_id: studentId,
        month_year: monthYear,
        amount_euro: amountEuro,
        is_paid: isPaid,
      },
      { onConflict: "student_id,month_year" }
    );

  if (error) {
    return { error: `Fehler beim Speichern der Monatszahlung: ${error.message}` };
  }

  revalidatePath("/students");
  revalidatePath("/dashboard");
  return { success: true };
}
