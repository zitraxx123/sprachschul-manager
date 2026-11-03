"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequestOrigin } from "@/lib/origin";
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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Ensure user has an organization upon login (fallback if trigger or signup missed it)
  if (data?.user) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();

    if (!existingMember) {
      const orgName = data.user.user_metadata?.organization_name || "Meine Sprachschule";
      const orgId = crypto.randomUUID();

      await supabase.from("organizations").insert({
        id: orgId,
        name: orgName,
      });

      await supabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: data.user.id,
        role: "owner",
      });
    }
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
  const organizationName = (formData.get("organizationName") as string)?.trim() || "Meine Sprachschule";

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

  // 2. Ensure organization exists (without .select() to avoid RLS SELECT block)
  if (data?.user) {
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();

    if (!existingMember) {
      const orgId = crypto.randomUUID();

      await supabase.from("organizations").insert({
        id: orgId,
        name: organizationName,
      });

      await supabase.from("organization_members").insert({
        organization_id: orgId,
        user_id: data.user.id,
        role: "owner",
      });
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Error values are i18n keys under "auth" (translated in the client components).
export async function requestPasswordReset(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) {
    return { error: "errorEmailRequired" };
  }

  const origin = await getRequestOrigin();

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Do not reveal whether the address exists; only surface rate limits.
  if (error && error.status === 429) {
    return { error: "errorRateLimit" };
  }

  return { success: true };
}

export async function updatePassword(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirmPassword") as string;

  if (!password || password.length < 6) {
    return { error: "errorPasswordShort" };
  }
  if (password !== confirm) {
    return { error: "errorPasswordMismatch" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "errorLinkExpired" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "errorUpdateFailed" };
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
