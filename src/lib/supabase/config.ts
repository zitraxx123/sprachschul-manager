/**
 * Helper to ensure the Supabase Project URL is properly formatted.
 * In Supabase dashboard, users often copy the REST URL (ending with /rest/v1/)
 * instead of the base project URL. This normalizes both formats.
 */
export function getSupabaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  return rawUrl.replace(/\/rest\/v1\/?$/, "");
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}
