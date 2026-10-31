"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization } from "@/lib/supabase/server";

export type RoomActionState = {
  error?: string;
  success?: boolean;
};

export async function createRoom(
  prevState: RoomActionState | null,
  formData: FormData
): Promise<RoomActionState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "Bitte geben Sie einen Raumnamen ein (z. B. Raum 1, Raum 2 oder Online)." };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({
    organization_id: organization.id,
    name,
  });

  if (error) {
    return { error: `Fehler beim Erstellen des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}

export async function updateRoom(
  prevState: RoomActionState | null,
  formData: FormData
): Promise<RoomActionState> {
  const id = (formData.get("id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!id || !name) {
    return { error: "Raum-ID und Name sind erforderlich." };
  }

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("rooms")
    .update({ name })
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: `Fehler beim Aktualisieren des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}

export async function deleteRoom(id: string): Promise<RoomActionState> {
  if (!id) return { error: "Ungültige Raum-ID." };

  const organization = await getActiveOrganization();
  if (!organization) return { error: "Keine aktive Sprachschule gefunden." };

  const supabase = await createClient();

  // First unassign room from any courses that reference it (redundancy in case FK has SET NULL)
  await supabase
    .from("courses")
    .update({ room_id: null })
    .eq("room_id", id)
    .eq("organization_id", organization.id);

  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .eq("organization_id", organization.id);

  if (error) {
    return { error: `Fehler beim Löschen des Raumes: ${error.message}` };
  }

  revalidatePath("/rooms");
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/my-portal");
  return { success: true };
}
