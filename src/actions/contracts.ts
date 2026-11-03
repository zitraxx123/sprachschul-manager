"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { DATE_RE } from "@/lib/contracts";

export type ContractActionState = {
  success?: boolean;
  errorCode?: "forbidden" | "notFound" | "invalid" | "dates" | "db";
  detail?: string;
};

export interface ContractInput {
  studentId: string;
  courseId: string;
  contractStart: string | null;
  contractEnd: string | null;
  noticePeriodWeeks: number;
  cancelledOn: string | null;
}

const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);

/** Saves contract data (term and cancellation) of one student/course enrollment. Admin only. */
export async function updateEnrollmentContract(input: ContractInput): Promise<ContractActionState> {
  const contractStart = clean(input.contractStart);
  const contractEnd = clean(input.contractEnd);
  const cancelledOn = clean(input.cancelledOn);
  const weeks = Number(input.noticePeriodWeeks);

  if (!input.studentId || !input.courseId) return { errorCode: "invalid" };
  if (!Number.isInteger(weeks) || weeks < 0 || weeks > 52) return { errorCode: "invalid" };
  for (const d of [contractStart, contractEnd, cancelledOn]) {
    if (d && !DATE_RE.test(d)) return { errorCode: "invalid" };
  }
  if (contractStart && contractEnd && contractEnd < contractStart) return { errorCode: "dates" };

  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { errorCode: "notFound" };
  if (!membership || membership.role === "teacher") return { errorCode: "forbidden" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_courses")
    .update({
      contract_start: contractStart,
      contract_end: contractEnd,
      notice_period_weeks: weeks,
      cancelled_on: cancelledOn,
    })
    .eq("organization_id", organization.id)
    .eq("student_id", input.studentId)
    .eq("course_id", input.courseId)
    .select("id");

  if (error) return { errorCode: "db", detail: error.message };
  if (!data || data.length === 0) return { errorCode: "notFound" };

  revalidatePath("/students");
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { success: true };
}
