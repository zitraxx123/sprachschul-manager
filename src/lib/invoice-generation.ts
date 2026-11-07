import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InvoiceItem, Organization } from "@/types/database";
import { contractCoversMonth } from "@/lib/contracts";
import { fetchAll } from "@/lib/supabase/fetch-all";

export interface InvoiceGenerationResult {
  errorCode?: "billingIncomplete" | "db";
  detail?: string;
  created: number;
  skipped: number;
  failed: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Today in Europe/Berlin as YYYY-MM-DD (the date printed on the invoice). */
export function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function isBillingComplete(org: Organization): boolean {
  const hasAddress = !!(org.address_street?.trim() && org.address_zip?.trim() && org.address_city?.trim());
  const hasTaxId = !!(org.tax_number?.trim() || org.vat_id?.trim());
  return hasAddress && hasTaxId;
}

interface StudentForBilling {
  id: string;
  first_name: string;
  last_name: string;
  parent_name: string | null;
  custom_monthly_price: number | null;
  student_courses: Array<{
    status: string | null;
    contract_start: string | null;
    contract_end: string | null;
    courses: { name: string; monthly_price: number | null } | null;
  }> | null;
}

/**
 * Creates one invoice per billable student of the organization for the given month ("YYYY-MM").
 * Billable = at least one ACTIVE enrollment whose contract runs in that month and an amount > 0.
 * Students that already have a non-cancelled invoice for the month are skipped, so it is safe to repeat.
 *
 * `rpc` selects the invoice-creating database function: "create_invoice" for a logged-in admin,
 * "create_invoice_system" for the cron job (service role client).
 */
export async function generateInvoicesCore(params: {
  supabase: SupabaseClient<Database>;
  org: Organization;
  monthYear: string;
  rpc: "create_invoice" | "create_invoice_system";
}): Promise<InvoiceGenerationResult> {
  const { supabase, org, monthYear, rpc } = params;

  if (!isBillingComplete(org)) return { errorCode: "billingIncomplete", created: 0, skipped: 0, failed: 0 };

  const [studentsRes, invoicesRes, paymentsRes] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("students")
        .select("id, first_name, last_name, parent_name, custom_monthly_price, student_courses(status, contract_start, contract_end, courses(name, monthly_price))")
        .eq("organization_id", org.id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true })
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("invoices")
        .select("student_id")
        .eq("organization_id", org.id)
        .eq("month_year", monthYear)
        .neq("status", "cancelled")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("monthly_payments")
        .select("student_id, is_paid")
        .eq("organization_id", org.id)
        .eq("month_year", monthYear)
        .order("id")
        .range(from, to)
    ),
  ]);

  const loadError = studentsRes.error || invoicesRes.error || paymentsRes.error;
  if (loadError) return { errorCode: "db", detail: loadError.message, created: 0, skipped: 0, failed: 0 };

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
      .filter(
        (sc) =>
          sc.status === "active" &&
          sc.courses &&
          contractCoversMonth({ contractStart: sc.contract_start, contractEnd: sc.contract_end }, monthYear)
      )
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

    const { error } = await supabase.rpc(rpc, {
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

  if (failed > 0 && created === 0) return { errorCode: "db", detail: lastDetail, created, skipped, failed };
  return { created, skipped, failed, detail: lastDetail };
}
