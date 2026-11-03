import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type PlanLimitError = "plan_limit_students" | "plan_limit_teachers";

/** Detects the exceptions raised by the database trigger enforce_plan_limit(). */
export function planLimitError(message: string | null | undefined): PlanLimitError | null {
  if (!message) return null;
  if (message.includes("plan_limit_students")) return "plan_limit_students";
  if (message.includes("plan_limit_teachers")) return "plan_limit_teachers";
  return null;
}

export interface PlanOption {
  key: string;
  name: string;
  maxStudents: number | null;
  maxTeachers: number | null;
  monthlyPrice: number;
}

export interface PlanUsage {
  plan: string;
  planName: string;
  maxStudents: number | null;
  maxTeachers: number | null;
  monthlyPrice: number;
  students: number;
  teachers: number;
  options: PlanOption[];
}

export async function getPlanUsage(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  planKey: string
): Promise<PlanUsage | null> {
  const [planRes, studentsRes, teachersRes, allPlansRes] = await Promise.all([
    supabase.from("plans").select("*").eq("key", planKey).maybeSingle(),
    supabase.from("students").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("teachers").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("plans").select("*").order("sort_order", { ascending: true }),
  ]);
  // Plans table missing (migration not applied yet): no limits shown, nothing enforced
  if (planRes.error || !planRes.data) return null;
  return {
    plan: planRes.data.key,
    planName: planRes.data.name,
    maxStudents: planRes.data.max_students,
    maxTeachers: planRes.data.max_teachers,
    monthlyPrice: Number(planRes.data.monthly_price_eur),
    students: studentsRes.count ?? 0,
    teachers: teachersRes.count ?? 0,
    options: (allPlansRes.data || []).map((p) => ({
      key: p.key,
      name: p.name,
      maxStudents: p.max_students,
      maxTeachers: p.max_teachers,
      monthlyPrice: Number(p.monthly_price_eur),
    })),
  };
}
