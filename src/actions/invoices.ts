"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { isFullAdmin } from "@/lib/roles";
import { generateInvoicesCore } from "@/lib/invoice-generation";

export type InvoiceActionState = {
  success?: boolean;
  errorCode?: "forbidden" | "notFound" | "invalid" | "billingIncomplete" | "invalidTransition" | "db";
  detail?: string;
  created?: number;
  skipped?: number;
  failed?: number;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function requireAdmin() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { error: "notFound" as const };
  if (!membership || !isFullAdmin(membership.role)) return { error: "forbidden" as const };
  return { organization };
}

/**
 * Creates one invoice per billable student for the given month ("YYYY-MM").
 * See generateInvoicesCore for the billing rules.
 */
export async function generateInvoicesForMonth(monthYear: string): Promise<InvoiceActionState> {
  if (!MONTH_RE.test(monthYear)) return { errorCode: "invalid" };

  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };

  const supabase = await createClient();
  const res = await generateInvoicesCore({
    supabase,
    org: auth.organization,
    monthYear,
    rpc: "create_invoice",
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/students");

  if (res.errorCode) {
    return { errorCode: res.errorCode, detail: res.detail, created: res.created, skipped: res.skipped, failed: res.failed };
  }
  return { success: true, created: res.created, skipped: res.skipped, failed: res.failed, detail: res.detail };
}

/** open -> paid / paid -> open / open -> cancelled (Storno). Issued invoices are never edited or deleted. */
export async function setInvoiceStatus(
  invoiceId: string,
  status: "open" | "paid" | "cancelled"
): Promise<InvoiceActionState> {
  if (!invoiceId || !["open", "paid", "cancelled"].includes(status)) return { errorCode: "invalid" };

  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };
  const org = auth.organization;

  const supabase = await createClient();
  const { data: invoice, error: loadError } = await supabase
    .from("invoices")
    .select("id, organization_id, student_id, month_year, total_amount, status")
    .eq("id", invoiceId)
    .eq("organization_id", org.id)
    .maybeSingle();

  if (loadError) return { errorCode: "db", detail: loadError.message };
  if (!invoice) return { errorCode: "notFound" };

  const allowed =
    (invoice.status === "open" && (status === "paid" || status === "cancelled")) ||
    (invoice.status === "paid" && status === "open");
  if (!allowed) return { errorCode: "invalidTransition" };

  const now = new Date().toISOString();
  const patch =
    status === "paid"
      ? { status, paid_at: now }
      : status === "open"
        ? { status, paid_at: null }
        : { status, cancelled_at: now };

  const { error } = await supabase.from("invoices").update(patch).eq("id", invoice.id);
  if (error) return { errorCode: "db", detail: error.message };

  if (invoice.student_id) {
    if (status === "cancelled") {
      await supabase
        .from("monthly_payments")
        .delete()
        .eq("student_id", invoice.student_id)
        .eq("month_year", invoice.month_year)
        .eq("is_paid", false);
    } else {
      await supabase.from("monthly_payments").upsert(
        {
          organization_id: org.id,
          student_id: invoice.student_id,
          month_year: invoice.month_year,
          amount_euro: Number(invoice.total_amount),
          is_paid: status === "paid",
        },
        { onConflict: "student_id,month_year" }
      );
    }
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/students");
  return { success: true };
}
