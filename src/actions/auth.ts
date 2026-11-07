"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequestOrigin } from "@/lib/origin";
import { isOrgType } from "@/lib/terminology";
import { createClient } from "@/lib/supabase/server";

/** Minimum password length for new passwords (the school stores personal data of minors). */
const MIN_PASSWORD_LENGTH = 10;

export type AuthState = {
  /** i18n key under "auth" */
  error?: string;
  success?: boolean;
  /** Sign-up succeeded but the e-mail address must be confirmed first */
  needsConfirmation?: boolean;
};

/** Maps raw Supabase auth errors to i18n keys under "auth". */
function authErrorKey(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "errorInvalidCredentials";
  if (m.includes("email not confirmed")) return "errorEmailNotConfirmed";
  if (m.includes("already registered") || m.includes("already been registered")) return "errorUserExists";
  if (m.includes("rate limit") || m.includes("too many")) return "errorRateLimit";
  if (m.includes("password") && m.includes("characters")) return "errorPasswordShort";
  return "errorGeneric";
}

export async function signIn(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "errorFieldsRequired" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: authErrorKey(error.message) };
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
  const orgTypeRaw = formData.get("organizationType");
  const orgType = isOrgType(orgTypeRaw) ? orgTypeRaw : "language_school";

  if (!email || !password) {
    return { error: "errorFieldsRequired" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: "errorPasswordShort" };
  }

  if (formData.get("consent") !== "on") {
    return { error: "errorConsentRequired" };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();

  // 1. Register user with organization_name in metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      data: {
        organization_name: organizationName,
        organization_type: orgType,
      },
    },
  });

  if (error) {
    return { error: authErrorKey(error.message) };
  }

  // E-mail confirmation is enabled: there is no session yet. The database trigger creates the school
  // from the sign-up metadata; the user continues after clicking the link in the e-mail.
  if (data?.user && !data.session) {
    return { success: true, needsConfirmation: true };
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
        org_type: orgType,
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

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
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
