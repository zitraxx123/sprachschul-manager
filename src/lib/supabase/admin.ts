import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseUrl } from "./config";

/**
 * Supabase client with the service role key. It bypasses RLS, so use it ONLY in trusted
 * server code without a user session (e.g. cron jobs) and never expose it to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient<Database>(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
