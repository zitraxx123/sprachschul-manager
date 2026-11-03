"use server";

import { revalidatePath } from "next/cache";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import {
  buildDirectDebitXml,
  isValidCreditorId,
  isValidIban,
  isValidMandateRef,
  normalizeBic,
  normalizeIban,
  sepaText,
  SepaSequence,
  SepaTransaction,
} from "@/lib/sepa";

export type SepaActionState = {
  success?: boolean;
  errorCode?:
    | "forbidden"
    | "notFound"
    | "invalid"
    | "invalidIban"
    | "invalidBic"
    | "invalidMandateRef"
    | "invalidDate"
    | "duplicateRef"
    | "creditorIncomplete"
    | "nothingToExport"
    | "db";
  detail?: string;
  xml?: string;
  filename?: string;
  count?: number;
  total?: number;
  skipped?: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

async function requireAdmin() {
  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization) return { error: "notFound" as const };
  if (!membership || membership.role === "teacher") return { error: "forbidden" as const };
  return { organization };
}

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export interface SepaMandateInput {
  studentId: string;
  accountHolder: string;
  iban: string;
  bic: string;
  mandateRef: string;
  mandateDate: string;
  sequenceType: SepaSequence;
}

/** Creates or updates the SEPA mandate of a student (admin only). */
export async function saveSepaMandate(input: SepaMandateInput): Promise<SepaActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };
  const org = auth.organization;

  const holder = sepaText(input.accountHolder, 70);
  const iban = normalizeIban(input.iban);
  const bicRaw = (input.bic || "").trim();
  const bic = normalizeBic(bicRaw);
  const ref = (input.mandateRef || "").trim();

  if (!input.studentId || !holder) return { errorCode: "invalid" };
  if (!isValidIban(iban)) return { errorCode: "invalidIban" };
  if (bicRaw && !bic) return { errorCode: "invalidBic" };
  if (!isValidMandateRef(ref)) return { errorCode: "invalidMandateRef" };
  if (!DATE_RE.test(input.mandateDate) || input.mandateDate > addDays(berlinToday(), 1)) {
    return { errorCode: "invalidDate" };
  }
  if (input.sequenceType !== "FRST" && input.sequenceType !== "RCUR") return { errorCode: "invalid" };

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", input.studentId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!student) return { errorCode: "notFound" };

  const { error } = await supabase.from("student_sepa_mandates").upsert(
    {
      student_id: input.studentId,
      organization_id: org.id,
      account_holder: holder,
      iban,
      bic,
      mandate_ref: ref,
      mandate_date: input.mandateDate,
      sequence_type: input.sequenceType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "student_id" }
  );

  if (error) {
    if (error.code === "23505") return { errorCode: "duplicateRef" };
    return { errorCode: "db", detail: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true };
}

export async function deleteSepaMandate(studentId: string): Promise<SepaActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_sepa_mandates")
    .delete()
    .eq("student_id", studentId)
    .eq("organization_id", auth.organization.id);
  if (error) return { errorCode: "db", detail: error.message };

  revalidatePath("/students");
  revalidatePath("/invoices");
  return { success: true };
}

/**
 * Builds a pain.008.001.02 file for all OPEN invoices of the month whose student has a valid mandate.
 * Invoices without a usable mandate are skipped and counted.
 */
export async function exportSepaDirectDebit(input: {
  monthYear: string;
  collectionDate: string;
  markRecurring: boolean;
}): Promise<SepaActionState> {
  if (!MONTH_RE.test(input.monthYear) || !DATE_RE.test(input.collectionDate)) return { errorCode: "invalid" };

  const auth = await requireAdmin();
  if ("error" in auth) return { errorCode: auth.error };
  const org = auth.organization;

  const today = berlinToday();
  if (input.collectionDate < addDays(today, 1) || input.collectionDate > addDays(today, 90)) {
    return { errorCode: "invalidDate" };
  }

  if (!org.iban || !isValidIban(org.iban) || !org.sepa_creditor_id || !isValidCreditorId(org.sepa_creditor_id)) {
    return { errorCode: "creditorIncomplete" };
  }

  const supabase = await createClient();
  const { data: invoices, error: invError } = await supabase
    .from("invoices")
    .select("id, student_id, invoice_number, total_amount, month_year")
    .eq("organization_id", org.id)
    .eq("month_year", input.monthYear)
    .eq("status", "open")
    .order("invoice_seq", { ascending: true });
  if (invError) return { errorCode: "db", detail: invError.message };

  const studentIds = (invoices || []).map((i) => i.student_id).filter((id): id is string => !!id);
  const { data: mandates, error: mError } = studentIds.length
    ? await supabase.from("student_sepa_mandates").select("*").eq("organization_id", org.id).in("student_id", studentIds)
    : { data: [], error: null };
  if (mError) return { errorCode: "db", detail: mError.message };

  const mandateByStudent = new Map((mandates || []).map((m) => [m.student_id, m]));
  const transactions: SepaTransaction[] = [];
  const usedFirst: string[] = [];
  let skipped = 0;

  for (const inv of invoices || []) {
    const mandate = inv.student_id ? mandateByStudent.get(inv.student_id) : undefined;
    const amount = Number(inv.total_amount);
    if (!mandate || !isValidIban(mandate.iban) || !(amount > 0)) {
      skipped++;
      continue;
    }
    transactions.push({
      endToEndId: inv.invoice_number,
      amount,
      mandateId: mandate.mandate_ref,
      mandateDate: mandate.mandate_date,
      debtorName: mandate.account_holder,
      debtorIban: mandate.iban,
      debtorBic: mandate.bic,
      remittance: `${org.name} Rechnung ${inv.invoice_number}`,
      sequence: mandate.sequence_type as SepaSequence,
    });
    if (mandate.sequence_type === "FRST" && inv.student_id) usedFirst.push(inv.student_id);
  }

  if (transactions.length === 0) return { errorCode: "nothingToExport", skipped };

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const xml = buildDirectDebitXml({
    creditor: { name: org.name, iban: org.iban, bic: org.bic, creditorId: org.sepa_creditor_id },
    collectionDate: input.collectionDate,
    transactions,
    messageId: `SDD-${stamp}`,
    createdAt: now,
  });

  // After a first collection the mandate continues as recurring (RCUR)
  if (input.markRecurring && usedFirst.length > 0) {
    await supabase
      .from("student_sepa_mandates")
      .update({ sequence_type: "RCUR", updated_at: now.toISOString() })
      .eq("organization_id", org.id)
      .in("student_id", usedFirst);
    revalidatePath("/students");
  }

  const total = Math.round(transactions.reduce((s, t) => s + Math.round(t.amount * 100), 0)) / 100;
  return {
    success: true,
    xml,
    filename: `lastschrift-${input.monthYear}.xml`,
    count: transactions.length,
    total,
    skipped,
  };
}
