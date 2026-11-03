"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestOrigin } from "@/lib/origin";
import { isFullAdmin } from "@/lib/roles";

export type TeamActionState = {
  /** i18n key under "team" */
  error?: string;
  link?: string;
  ok?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization || !membership || !isFullAdmin(membership.role)) return null;
  return organization;
}

/**
 * Invites an assistant: stores the invitation (the DB trigger turns it into a membership when the account
 * is created) and returns a one-time link to set a password. No mail service needed, the admin sends the link.
 */
export async function inviteAssistant(rawEmail: string): Promise<TeamActionState> {
  const organization = await requireAdmin();
  if (!organization) return { error: "errorForbidden" };

  const email = (rawEmail || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "errorEmail" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "errorServer" };
  }

  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: invite, error: insertError } = await supabase
    .from("organization_invites")
    .insert({ organization_id: organization.id, email, role: "assistant", created_by: user?.id ?? null })
    .select("id")
    .single();
  if (insertError || !invite) {
    // unique violation = already invited
    return { error: insertError?.code === "23505" ? "errorAlreadyInvited" : "errorServer" };
  }

  const res = await admin.auth.admin.generateLink({ type: "invite", email });
  const hashedToken = res.data?.properties?.hashed_token;
  if (res.error || !hashedToken) {
    // The account exists already (or the link failed): do not leave a dangling invitation behind.
    await supabase.from("organization_invites").delete().eq("id", invite.id);
    return { error: "errorAccountExists" };
  }

  const origin = await getRequestOrigin();
  revalidatePath("/settings");
  return { link: `${origin}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=/reset-password` };
}

/** Removes the assistant's access (the sign-in account itself stays, but sees no school data). */
export async function removeAssistant(membershipId: string): Promise<TeamActionState> {
  const organization = await requireAdmin();
  if (!organization) return { error: "errorForbidden" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", membershipId)
    .eq("organization_id", organization.id)
    .eq("role", "assistant");
  if (error) return { error: "errorServer" };
  revalidatePath("/settings");
  return { ok: true };
}

export async function cancelInvite(inviteId: string): Promise<TeamActionState> {
  const organization = await requireAdmin();
  if (!organization) return { error: "errorForbidden" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("organization_id", organization.id);
  if (error) return { error: "errorServer" };
  revalidatePath("/settings");
  return { ok: true };
}

export type TeamData = {
  assistants: Array<{ membershipId: string; email: string }>;
  invites: Array<{ id: string; email: string }>;
};

export async function getTeamData(organizationId: string): Promise<TeamData> {
  const supabase = await createClient();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("organization_members").select("id, user_id").eq("organization_id", organizationId).eq("role", "assistant"),
    supabase.from("organization_invites").select("id, email").eq("organization_id", organizationId).order("created_at", { ascending: true }),
  ]);

  const assistants: TeamData["assistants"] = [];
  if (members && members.length) {
    try {
      const admin = createAdminClient();
      for (const m of members) {
        const { data } = await admin.auth.admin.getUserById(m.user_id);
        assistants.push({ membershipId: m.id, email: data.user?.email || "—" });
      }
    } catch {
      for (const m of members) assistants.push({ membershipId: m.id, email: "—" });
    }
  }
  return { assistants, invites: invites || [] };
}
