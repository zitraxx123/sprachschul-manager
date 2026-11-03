"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import type { InvoiceItem } from "@/types/database";

export type InvoiceActionState = {
  success?: boolean;
  errorCode?: "forbidden" | "notFound" | "invalid" | "billingIncomplete" | "invalidTransition" | "db";
  detail?: string;
  created?: number;
  skipped?: number;
  failed?: number;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Today in Europe/Berlin as YYYY-MM-DD (the date printed on the invoice). */
function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

async function requireAdmin() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { error: "notFound" as const };
  if (!membership || membership.role === "teacher") return { error: "forbidden" as const };
  return { organization };
}

interface StudentForBilling {
  id: string;
  first_name: string;
  last_name: string;
  parent_name: string | null;
  custom_monthly_price: number | null;
  student_courses: Array<{
    status: string | null;
    courses: { name: string; monthly_price: number | null } | null;
  }> | null;
}

/**
 * Creates one invoice per billable student for the given month ("YYYY-MM").
 * Billable = at least one ACTIVE enrollment and an amount > 0. Students that already
 * have a non-cancelled invoice for the month are skipped, so the action can be repeated safely.
 */
export async function generateInvoicesForMonth(monthYear: string): Promise<InvoiceActionState> {
  if (!MONTH_RE.test(monthYear)) return { errorCode: "invalid" };

  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };
  const org = auth.organization;

  const hasAddress = !!(org.address_street?.trim() && org.address_zip?.trim() && org.address_city?.trim());
  const hasTaxId = !!(org.tax_number?.trim() || org.vat_id?.trim());
  if (!hasAddress || !hasTaxId) return { errorCode: "billingIncomplete" };

  const supabase = await createClient();

  const [studentsRes, invoicesRes, paymentsRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, first_name, last_name, parent_name, custom_monthly_price, student_courses(status, courses(name, monthly_price))")
      .eq("organization_id", org.id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true }),
    supabase
      .from("invoices")
      .select("student_id")
      .eq("organization_id", org.id)
      .eq("month_year", monthYear)
      .neq("status", "cancelled"),
    supabase
      .from("monthly_payments")
      .select("student_id, is_paid")
      .eq("organization_id", org.id)
      .eq("month_year", monthYear),
  ]);

  if (studentsRes.error) return { errorCode: "db", detail: studentsRes.error.message };
  if (invoicesRes.error) return { errorCode: "db", detail: invoicesRes.error.message };
  if (paymentsRes.error) return { errorCode: "db", detail: paymentsRes.error.message };

  const students = (studentsRes.data || []) as unknown as StudentForBilling[];
  const alreadyInvoiced = new Set((invoicesRes.data || []).map((i) => i.student_id));
  const paymentByStudent = new Map((paymentsRes.data || []).map((p) => [p.student_id, p]));

  const [year, month] = monthYear.split("-").map(Number);
  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const vatRate = Number(org.invoice_vat_rate || 0);
  const issueDate = berlinToday();
  const dueDate = addDays(issueDate, Number(org.invoice_payment_days ?? 14));

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let lastDetail: string | undefined;
  const unpaidPaymentRows: Array<{
    organization_id: string;
    student_id: string;
    month_year: string;
    amount_euro: number;
    is_paid: boolean;
  }> = [];

  for (const student of students) {
    if (alreadyInvoiced.has(student.id)) {
      skipped++;
      continue;
    }

    const activeCourses = (student.student_courses || [])
      .filter((sc) => sc.status === "active" && sc.courses)
      .map((sc) => sc.courses!);

    if (activeCourses.length === 0) {
      skipped++;
      continue;
    }

    const items: InvoiceItem[] = [];
    if (student.custom_monthly_price !== null && student.custom_monthly_price !== undefined) {
      const price = round2(Number(student.custom_monthly_price));
      if (price > 0) {
        items.push({ description: `Monatsbeitrag ${monthLabel}`, quantity: 1, unit_price: price, total: price });
      }
    } else {
      for (const c of activeCourses) {
        const price = round2(Number(c.monthly_price || 0));
        if (price > 0) {
          items.push({
            description: `Monatsbeitrag ${monthLabel} – ${c.name}`,
            quantity: 1,
            unit_price: price,
            total: price,
          });
        }
      }
    }

    if (items.length === 0) {
      skipped++;
      continue;
    }

    const net = round2(items.reduce((sum, i) => sum + i.total, 0));
    const vatAmount = round2((net * vatRate) / 100);
    const total = round2(net + vatAmount);
    const studentName = `${student.first_name} ${student.last_name}`.trim();
    const existingPayment = paymentByStudent.get(student.id);
    const status: "open" | "paid" = existingPayment?.is_paid ? "paid" : "open";

    const { error } = await supabase.rpc("create_invoice", {
      p_org: org.id,
      p_student: student.id,
      p_student_name: studentName,
      p_recipient_name: student.parent_name?.trim() || studentName,
      p_month_year: monthYear,
      p_issue_date: issueDate,
      p_due_date: dueDate,
      p_items: items,
      p_net: net,
      p_vat_rate: vatRate,
      p_vat_amount: vatAmount,
      p_total: total,
      p_status: status,
    });

    if (error) {
      failed++;
      lastDetail = error.message;
      continue;
    }

    created++;
    if (!existingPayment) {
      unpaidPaymentRows.push({
        organization_id: org.id,
        student_id: student.id,
        month_year: monthYear,
        amount_euro: total,
        is_paid: false,
      });
    }
  }

  // Keep the dashboard's debtor list in sync: unpaid invoice => unpaid monthly payment record
  if (unpaidPaymentRows.length > 0) {
    await supabase
      .from("monthly_payments")
      .upsert(unpaidPaymentRows, { onConflict: "student_id,month_year", ignoreDuplicates: true });
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  revalidatePath("/students");

  if (failed > 0 && created === 0) return { errorCode: "db", detail: lastDetail, created, skipped, failed };
  return { success: true, created, skipped, failed, detail: lastDetail };
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
