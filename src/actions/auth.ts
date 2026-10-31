"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: boolean;
};

export async function signIn(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Bitte geben Sie E-Mail und Passwort ein." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const organizationName = (formData.get("organizationName") as string) || "Meine Sprachschule";

  if (!email || !password) {
    return { error: "Bitte geben Sie alle Pflichtfelder ein." };
  }

  if (password.length < 6) {
    return { error: "Das Passwort muss mindestens 6 Zeichen lang sein." };
  }

  const supabase = await createClient();

  // 1. Register user with organization_name in metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        organization_name: organizationName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 2. Ensure organization exists (Fallback if PostgreSQL trigger was not run yet)
  if (data.user) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!existingMember) {
      const { data: newOrg } = await supabase
        .from("organizations")
        .insert({ name: organizationName })
        .select()
        .single();

      if (newOrg) {
        await supabase.from("organization_members").insert({
          organization_id: newOrg.id,
          user_id: data.user.id,
          role: "owner",
        });
      }
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
