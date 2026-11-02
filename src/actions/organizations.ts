"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getActiveOrganization } from "@/lib/supabase/server";

export type OrgActionState = {
  error?: string;
  success?: boolean;
};

export async function createOrganization(
  prevState: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const name = (formData.get("name") as string)?.trim() || "Meine Sprachschule";
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Sie sind nicht angemeldet. Bitte loggen Sie sich ein." };
  }

  const supabase = await createClient();
  const orgId = crypto.randomUUID();

  // 1. Insert into organizations (without .select() to prevent RLS SELECT block)
  const { error: orgError } = await supabase.from("organizations").insert({
    id: orgId,
    name,
  });

  if (orgError) {
    return { error: `Fehler beim Erstellen der Organisation: ${orgError.message}` };
  }

  // 2. Insert into organization_members with the new orgId
  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: orgId,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: `Fehler bei der Mitglieder-Zuweisung: ${memberError.message}` };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateOrganizationSettings(
  prevState: OrgActionState | null,
  formData: FormData
): Promise<OrgActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sie sind nicht angemeldet. Bitte loggen Sie sich ein." };
  }

  const organization = await getActiveOrganization();
  if (!organization) {
    return { error: "Keine Organisation gefunden." };
  }

  const name = (formData.get("name") as string)?.trim();
  const lateCancellationHours = parseInt(formData.get("late_cancellation_hours") as string, 10);
  const lateCancellationPayPercent = parseInt(formData.get("late_cancellation_pay_percent") as string, 10);

  if (isNaN(lateCancellationHours) || lateCancellationHours < 0) {
    return { error: "Ungültige Stornierungsfrist (Stunden)." };
  }

  if (isNaN(lateCancellationPayPercent) || lateCancellationPayPercent < 0 || lateCancellationPayPercent > 100) {
    return { error: "Ungültiger Honorar-Prozentsatz (0 - 100%)." };
  }

  const supabase = await createClient();
  const updateData: {
    late_cancellation_hours: number;
    late_cancellation_pay_percent: number;
    name?: string;
    logo_url?: string | null;
  } = {
    late_cancellation_hours: lateCancellationHours,
    late_cancellation_pay_percent: lateCancellationPayPercent,
  };
  if (name) {
    updateData.name = name;
  }

  // Handle Logo Upload / Removal
  const removeLogo = formData.get("remove_logo") as string | null;
  const logoFile = formData.get("logo") as File | null;

  if (removeLogo === "true") {
    updateData.logo_url = null;
  } else if (logoFile && logoFile.size > 0 && typeof logoFile.name === "string") {
    // Validate file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (logoFile.size > MAX_SIZE) {
      return { error: "Die Logodatei darf maximal 5 MB groß sein." };
    }

    // Validate MIME type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
    if (logoFile.type && !validMimes.includes(logoFile.type)) {
      return { error: "Ungültiges Dateiformat. Bitte ein Bild (PNG, JPG, WebP oder SVG) hochladen." };
    }

    const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `${organization.id}/logo-${Date.now()}.${fileExt}`;

    const arrayBuffer = await logoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadErr } = await supabase.storage
      .from("logos")
      .upload(filePath, buffer, {
        contentType: logoFile.type || "image/png",
        upsert: true,
      });

    if (uploadErr) {
      return { error: `Fehler beim Speichern des Logos: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    updateData.logo_url = urlData.publicUrl;
  }

  const { error } = await supabase
    .from("organizations")
    .update(updateData)
    .eq("id", organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/login");
  revalidatePath("/my-portal");
  revalidatePath("/lessons");
  revalidatePath("/teachers");
  revalidatePath("/dashboard");
  return { success: true };
}
