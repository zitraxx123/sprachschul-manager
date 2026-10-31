import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database, Organization, Teacher } from "@/types/database";
import { getSupabaseUrl, getSupabaseAnonKey } from "./config";

/**
 * Creates Supabase server client for the current request context.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Component
          }
        },
      },
    }
  );
}

/**
 * Returns current authenticated user or null.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Returns the active organization for current user.
 * In a multi-tenant setup, this fetches the first organization the user is a member of.
 */
export async function getActiveOrganization(): Promise<Organization | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    // 1. Get user's organization membership
    const { data: member } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member || !member.organization_id) return null;

    // 2. Fetch the organization record directly
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .maybeSingle();

    return org || null;
  } catch {
    return null;
  }
}

/**
 * Returns current user's membership and role in active organization.
 */
export async function getCurrentMembership() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const supabase = await createClient();

    const { data: member } = await supabase
      .from("organization_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return member;
  } catch {
    return null;
  }
}

/**
 * Returns teacher profile if current user is linked to a teacher record.
 */
export async function getCurrentTeacher(): Promise<Teacher | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const org = await getActiveOrganization();
    if (!org) return null;

    const supabase = await createClient();

    const { data: teacher } = await supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle();

    return teacher || null;
  } catch {
    return null;
  }
}
