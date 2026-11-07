import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DOCUMENT_LOCALE, getDocumentTranslator } from "@/lib/document-translations";
import { ArrowLeft } from "lucide-react";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { PrintButton } from "@/components/invoices/print-button";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { InvoiceItem } from "@/types/database";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("invoices");
  return { title: `${t("docTitle")} • Klasswerk` };
}

export default async function InvoiceDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, organization, membership, t] = await Promise.all([
    params,
    getActiveOrganization(),
    getCurrentMembership(),
    getTranslations("invoices"),
  ]);

  const locale: string = DOCUMENT_LOCALE;
  const tDoc = getDocumentTranslator("invoices");

  if (membership?.role === "teacher") redirect("/my-portal");
  if (membership?.role === "assistant") redirect("/students");
  if (!organization) notFound();

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!invoice) notFound();

  const items = (invoice.items || []) as InvoiceItem[];
  const [year, month] = invoice.month_year.split("-").map(Number);
  const intlLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";
  const periodLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const isCancelled = invoice.status === "cancelled";
  const isPaid = invoice.status === "paid";

  return (
    <div className="max-w-[210mm] mx-auto space-y-4 print:space-y-0 print:max-w-none">
      {/* Toolbar (not printed) */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/invoices?month=${invoice.month_year}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 space-x-2 dark:border-slate-700 dark:text-slate-200")}
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("back")}</span>
        </Link>
        <PrintButton />
      </div>

      {/* Paper: intentionally always white with dark text, so the printout looks the same in dark mode */}
      <article className="relative bg-white text-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-12 print:border-0 print:shadow-none print:rounded-none print:p-0 overflow-hidden">
        {isCancelled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-12 border-4 border-red-500/60 text-red-500/60 text-5xl sm:text-7xl font-black tracking-widest px-6 py-2 rounded-lg">
              {tDoc("docCancelled")}
            </span>
          </div>
        )}

        {/* Issuer */}
        <header className="flex flex-col-reverse sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="text-xs text-slate-500">
            <p className="underline decoration-slate-300 underline-offset-2 mb-3">
              {organization.name} · {organization.address_street} · {organization.address_zip} {organization.address_city}
            </p>
            <p className="text-sm font-semibold text-slate-900">{invoice.recipient_name}</p>
          </div>
          <div className="text-xs text-slate-600 sm:text-right space-y-0.5">
            {organization.logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={organization.logo_url} alt={organization.name} className="h-14 w-auto object-contain mb-2 sm:ml-auto" />
            )}
            <p className="font-semibold text-slate-900 text-sm">{organization.name}</p>
            <p>{organization.address_street}</p>
            <p>
              {organization.address_zip} {organization.address_city}
            </p>
          </div>
        </header>

        {/* Title + meta */}
        <div className="mt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{tDoc("docTitle")}</h1>
          <dl className="text-xs grid grid-cols-[auto_auto] gap-x-4 gap-y-1 sm:text-right">
            <dt className="text-slate-500">{tDoc("docNumber")}</dt>
            <dd className="font-semibold font-mono">{invoice.invoice_number}</dd>
            <dt className="text-slate-500">{tDoc("docDate")}</dt>
            <dd className="font-semibold">{formatDate(invoice.issue_date, locale)}</dd>
            <dt className="text-slate-500">{tDoc("docPeriod")}</dt>
            <dd className="font-semibold">{periodLabel}</dd>
            <dt className="text-slate-500">{tDoc("docStudent")}</dt>
            <dd className="font-semibold">{invoice.student_name}</dd>
          </dl>
        </div>

        {/* Items */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-2 font-semibold w-10">{tDoc("docPosition")}</th>
                <th className="py-2 pr-2 font-semibold">{tDoc("docDescription")}</th>
                <th className="py-2 pr-2 font-semibold text-right">{tDoc("docQty")}</th>
                <th className="py-2 pr-2 font-semibold text-right whitespace-nowrap">{tDoc("docUnitPrice")}</th>
                <th className="py-2 font-semibold text-right">{tDoc("docTotal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 pr-2 text-slate-500">{idx + 1}</td>
                  <td className="py-2 pr-2">{item.description}</td>
                  <td className="py-2 pr-2 text-right">{item.quantity}</td>
                  <td className="py-2 pr-2 text-right whitespace-nowrap">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-4 ml-auto w-full sm:w-72 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-600">{tDoc("docNet")}</span>
            <span>{formatCurrency(Number(invoice.net_amount))}</span>
          </div>
          {Number(invoice.vat_rate) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">{tDoc("docVat", { rate: String(Number(invoice.vat_rate)) })}</span>
              <span>{formatCurrency(Number(invoice.vat_amount))}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-base font-bold">
            <span>{tDoc("docGross")}</span>
            <span>{formatCurrency(Number(invoice.total_amount))}</span>
          </div>
        </div>

        {organization.invoice_tax_note && (
          <p className="mt-6 text-xs text-slate-600 whitespace-pre-line">{organization.invoice_tax_note}</p>
        )}

        {/* Payment */}
        <div className="mt-8 text-sm text-slate-700 space-y-2">
          {isPaid ? (
            <p>{tDoc("docPaidNote")}</p>
          ) : (
            <>
              <p>{tDoc("docPayText", { date: formatDate(invoice.due_date, locale) })}</p>
              {organization.iban && (
                <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 max-w-sm">
                  {organization.bank_name && (
                    <>
                      <dt className="text-slate-500">{tDoc("docBank")}</dt>
                      <dd className="font-semibold">{organization.bank_name}</dd>
                    </>
                  )}
                  <dt className="text-slate-500">{tDoc("docIban")}</dt>
                  <dd className="font-semibold font-mono break-all">{organization.iban}</dd>
                  {organization.bic && (
                    <>
                      <dt className="text-slate-500">{tDoc("docBic")}</dt>
                      <dd className="font-semibold font-mono">{organization.bic}</dd>
                    </>
                  )}
                </dl>
              )}
            </>
          )}
        </div>

        {/* Footer: tax identifiers */}
        <footer className="mt-12 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          <span>{organization.name}</span>
          {organization.tax_number && (
            <span>
              {tDoc("docTaxNumber")}: {organization.tax_number}
            </span>
          )}
          {organization.vat_id && (
            <span>
              {tDoc("docVatId")}: {organization.vat_id}
            </span>
          )}
        </footer>
      </article>
    </div>
  );
}
