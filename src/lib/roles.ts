/** Membership roles. owner/admin = full access, assistant = daily work without finances, teacher = own portal only. */
export type MemberRole = "owner" | "admin" | "assistant" | "teacher";

/** Full access (finances, teachers' rates, settings, audit log). */
export function isFullAdmin(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function isAssistantRole(role: string | null | undefined): boolean {
  return role === "assistant";
}
