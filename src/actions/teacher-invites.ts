"use server";

import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestOrigin } from "@/lib/origin";

export type TeacherInviteState = {
  /** i18n key under "teachers" */
  error?: string;
  link?: string;
};

/**
 * Creates a one-time sign-in link for a teacher so the admin can send it manually
 * (no mail service required). The link lets the teacher set a password.
 * A new auth user is created if needed; the DB trigger links it to the teacher record.
 */
export async function createTeacherInviteLink(teacherId: string): Promise<TeacherInviteState> {
  const [organization, membership] = await Promise.all([
    getActiveOrganization(),
    getCurrentMembership(),
  ]);
  if (!organization || !membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "inviteErrorForbidden" };
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id, email, user_id")
    .eq("id", teacherId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!teacher) return { error: "inviteErrorNotFound" };
  if (!teacher.email) return { error: "inviteErrorNoEmail" };
  if (teacher.user_id) return { error: "inviteErrorAlreadyLinked" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "inviteErrorServer" };
  }

  const email = teacher.email.trim().toLowerCase();
  let type: "invite" | "recovery" = "invite";
  let res = await admin.auth.admin.generateLink({ type: "invite", email });
  if (res.error) {
    // The account already exists (teacher registered on their own): use a recovery link instead.
    type = "recovery";
    res = await admin.auth.admin.generateLink({ type: "recovery", email });
  }

  const hashedToken = res.data?.properties?.hashed_token;
  if (res.error || !hashedToken) return { error: "inviteErrorServer" };

  // Make sure the teacher record is linked to the account (trigger does it on update).
  await supabase.from("teachers").update({ email }).eq("id", teacher.id);

  const origin = await getRequestOrigin();
  const link = `${origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=${type}&next=/reset-password`;
  return { link };
}
