import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AlertCircle, Receipt } from "lucide-react";
import {
  createClient,
  getActiveOrganization,
  getCurrentMembership,
} from "@/lib/supabase/server";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { InvoiceGenerator } from "@/components/invoices/invoice-generator";
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions";
import { AccountingExport } from "@/components/invoices/accounting-export";
import { SepaExport } from "@/components/invoices/sepa-export";
import { isValidCreditorId, isValidIban } from "@/lib/sepa";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tNav = await getTranslations("nav");
  return { title: `${tNav("invoices")} • Sprachschul-Manager` };
}

type InvoiceStatus = "open" | "paid" | "cancelled";

const STATUS_VARIANT: Record<InvoiceStatus, "warning" | "success" | "secondary"> = {
  open: "warning",
  paid: "success",
  cancelled: "secondary",
};

function berlinDay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function berlinMonth(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date()).slice(0, 7);
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month: monthParam }, organization, membership, t, locale] = await Promise.all([
    searchParams,
    getActiveOrganization(),
    getCurrentMembership(),
    getTranslations("invoices"),
    getLocale(),
  ]);

  if (membership?.role === "teacher") redirect("/my-portal");
  if (membership?.role === "assistant") redirect("/students");
  if (!organization) return <CreateOrganizationCard />;

  const month = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : berlinMonth();

  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, student_id, student_name, recipient_name, issue_date, due_date, total_amount, status")
    .eq("organization_id", organization.id)
    .eq("month_year", month)
    .order("invoice_seq", { ascending: true });

  const invoices = data || [];
  const live = invoices.filter((i) => i.status !== "cancelled");
  const sum = (list: typeof invoices) => list.reduce((acc, i) => acc + Number(i.total_amount), 0);
  const totalAll = sum(live);
  const totalOpen = sum(live.filter((i) => i.status === "open"));
  const totalPaid = sum(live.filter((i) => i.status === "paid"));

  const billingComplete =
    !!(organization.address_street?.trim() && organization.address_zip?.trim() && organization.address_city?.trim()) &&
    !!(organization.tax_number?.trim() || organization.vat_id?.trim());

  // SEPA export readiness: open invoices whose student has a valid mandate
  const openInvoices = invoices.filter((i) => i.status === "open");
  const openStudentIds = openInvoices.map((i) => i.student_id).filter((id): id is string => !!id);
  let mandateStudentIds = new Set<string>();
  if (openStudentIds.length > 0) {
    const { data: mandates } = await supabase
      .from("student_sepa_mandates")
      .select("student_id, iban")
      .eq("organization_id", organization.id)
      .in("student_id", openStudentIds);
    mandateStudentIds = new Set((mandates || []).filter((m) => isValidIban(m.iban)).map((m) => m.student_id));
  }
  const sepaEligible = openInvoices.filter((i) => i.student_id && mandateStudentIds.has(i.student_id)).length;
  const sepaMissing = openInvoices.length - sepaEligible;
  const creditorReady =
    !!organization.iban &&
    isValidIban(organization.iban) &&
    !!organization.sepa_creditor_id &&
    isValidCreditorId(organization.sepa_creditor_id);
  const [ty, tm, td] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" })
    .format(new Date())
    .split("-")
    .map(Number);
  const defaultCollectionDate = new Date(Date.UTC(ty, tm - 1, td + 3)).toISOString().slice(0, 10);

  const statusLabel = (s: InvoiceStatus) =>
    s === "open" ? t("statusOpen") : s === "paid" ? t("statusPaid") : t("statusCancelled");

  const summary = [
    { label: t("sumTotal"), value: totalAll, tone: "text-slate-900 dark:text-white" },
    { label: t("sumOpen"), value: totalOpen, tone: "text-amber-600 dark:text-amber-400" },
    { label: t("sumPaid"), value: totalPaid, tone: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center space-x-3">
        <Receipt strokeWidth={1.5} className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t("subtitle")}</p>
        </div>
      </div>

      {!billingComplete && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-amber-800 dark:text-amber-300">
          <div className="flex items-start space-x-2 flex-1">
            <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t("billingIncompleteTitle")}</p>
              <p className="text-xs mt-0.5">{t("billingIncompleteText")}</p>
            </div>
          </div>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs shrink-0 dark:border-slate-700 dark:text-slate-200")}
          >
            {t("goToSettings")}
          </Link>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <InvoiceGenerator month={month} billingComplete={billingComplete} />
        </CardContent>
      </Card>

      {openInvoices.length > 0 && (
        <SepaExport
          month={month}
          eligible={sepaEligible}
          missing={sepaMissing}
          creditorReady={creditorReady}
          defaultDate={defaultCollectionDate}
        />
      )}

      <AccountingExport month={month} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.tone}`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("empty")}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-semibold">{t("number")}</th>
                  <th className="px-4 py-3 font-semibold">{t("student")}</th>
                  <th className="px-4 py-3 font-semibold">{t("issueDate")}</th>
                  <th className="px-4 py-3 font-semibold">{t("dueDate")}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t("amount")}</th>
                  <th className="px-4 py-3 font-semibold">{t("status")}</th>
                  <th className="px-4 py-3 font-semibold">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="text-slate-800 dark:text-slate-200">
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{inv.student_name}</div>
                      {inv.recipient_name !== inv.student_name && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{inv.recipient_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.issue_date, locale)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.due_date, locale)}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {formatCurrency(Number(inv.total_amount))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[inv.status as InvoiceStatus]}>
                        {statusLabel(inv.status as InvoiceStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceRowActions invoiceId={inv.id} status={inv.status as InvoiceStatus} overdue={inv.status === "open" && inv.due_date < berlinDay()} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{inv.student_name}</p>
                    <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{inv.invoice_number}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[inv.status as InvoiceStatus]} className="shrink-0">
                    {statusLabel(inv.status as InvoiceStatus)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    {t("dueDate")}: {formatDate(inv.due_date, locale)}
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {formatCurrency(Number(inv.total_amount))}
                  </span>
                </div>
                <InvoiceRowActions invoiceId={inv.id} status={inv.status as InvoiceStatus} overdue={inv.status === "open" && inv.due_date < berlinDay()} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
