"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";

export type WaitlistActionState = {
  success?: boolean;
  errorCode?: "forbidden" | "notFound" | "full" | "nobody" | "db";
  detail?: string;
  promoted?: number;
  names?: string[];
};

/**
 * Moves students from the waiting list to 'active' while the course has free places
 * (oldest enrollment first). Admin only.
 */
export async function promoteFromWaitlist(courseId: string): Promise<WaitlistActionState> {
  if (!courseId) return { errorCode: "notFound" };

  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { errorCode: "notFound" };
  if (!membership || membership.role === "teacher") return { errorCode: "forbidden" };

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, max_capacity")
    .eq("id", courseId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!course) return { errorCode: "notFound" };

  const { data: links, error: linkError } = await supabase
    .from("student_courses")
    .select("student_id, status, created_at, students(first_name, last_name)")
    .eq("organization_id", organization.id)
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });
  if (linkError) return { errorCode: "db", detail: linkError.message };

  const rows = (links || []) as unknown as Array<{
    student_id: string;
    status: string | null;
    students: { first_name: string; last_name: string } | null;
  }>;

  const maxCapacity = course.max_capacity || 10;
  const activeCount = rows.filter((r) => !r.status || r.status === "active").length;
  const free = maxCapacity - activeCount;
  if (free <= 0) return { errorCode: "full" };

  const next = rows.filter((r) => r.status === "waiting").slice(0, free);
  if (next.length === 0) return { errorCode: "nobody" };

  const { error } = await supabase
    .from("student_courses")
    .update({ status: "active" })
    .eq("organization_id", organization.id)
    .eq("course_id", courseId)
    .in(
      "student_id",
      next.map((r) => r.student_id)
    );

  if (error) {
    if (error.message.includes("course_full")) return { errorCode: "full" };
    return { errorCode: "db", detail: error.message };
  }

  revalidatePath("/courses");
  revalidatePath("/students");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");

  return {
    success: true,
    promoted: next.length,
    names: next.map((r) => `${r.students?.first_name || ""} ${r.students?.last_name || ""}`.trim()).filter(Boolean),
  };
}
