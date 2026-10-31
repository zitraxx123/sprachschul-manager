"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

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
