import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DOCUMENT_LOCALE, getDocumentTranslator } from "@/lib/document-translations";
import { ArrowLeft } from "lucide-react";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { PrintButton } from "@/components/invoices/print-button";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("reminder");
  return { title: `${t("level0")} • Klasswerk` };
}

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Printable payment reminder / dunning letter for an overdue open invoice. */
export default async function ReminderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ level?: string; fee?: string; days?: string }>;
}) {
  const [{ id }, sp, organization, membership, t, tInv] = await Promise.all([
    params,
    searchParams,
    getActiveOrganization(),
    getCurrentMembership(),
    getTranslations("reminder"),
    getTranslations("invoices"),
  ]);

  const locale: string = DOCUMENT_LOCALE;
  const tDoc = getDocumentTranslator("reminder");
  const tInvDoc = getDocumentTranslator("invoices");

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
  if (invoice.status !== "open") redirect(`/invoices/${invoice.id}`);

  const levelNum = Math.min(2, Math.max(0, parseInt(sp.level || "0", 10) || 0));
  const level = (["0", "1", "2"][levelNum]) as "0" | "1" | "2";
  const fee = Math.max(0, Math.round((parseFloat((sp.fee || "0").replace(",", ".")) || 0) * 100) / 100);
  const days = Math.min(60, Math.max(1, parseInt(sp.days || "7", 10) || 7));

  const today = berlinToday();
  const payBy = addDays(today, days);
  const amount = Number(invoice.total_amount);
  const total = Math.round((amount + fee) * 100) / 100;

  return (
    <div className="max-w-[210mm] mx-auto space-y-4 print:space-y-0 print:max-w-none">
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/invoices?month=${invoice.month_year}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 space-x-2 dark:border-slate-700 dark:text-slate-200")}
          >
            <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
            <span>{tInv("back")}</span>
          </Link>
          <PrintButton />
        </div>
        <form method="GET" className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="space-y-1">
            <Label htmlFor="level" className="text-xs">{t("level")}</Label>
            <select
              id="level"
              name="level"
              defaultValue={level}
              className="h-10 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm"
            >
              <option value="0">{t("level0")}</option>
              <option value="1">{t("level1")}</option>
              <option value="2">{t("level2")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="fee" className="text-xs">{t("fee")}</Label>
            <Input id="fee" name="fee" type="number" step="0.01" min="0" defaultValue={fee || ""} placeholder="0,00" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="days" className="text-xs">{t("days")}</Label>
            <Input id="days" name="days" type="number" min="1" max="60" defaultValue={days} />
          </div>
          <Button type="submit" variant="outline">{t("apply")}</Button>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("feeHint")}</p>
      </div>

      {/* Paper: always white, so print looks the same in dark mode */}
      <article className="bg-white text-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-12 print:border-0 print:shadow-none print:rounded-none print:p-0">
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

        <div className="mt-10 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{tDoc(`level${level}`)}</h1>
          <p className="text-xs text-slate-600">{formatDate(today, locale)}</p>
        </div>

        <div className="mt-6 text-sm text-slate-800 space-y-3">
          <p>{tDoc("salutation")}</p>
          <p>{tDoc(`body${level}`, { date: formatDate(payBy, locale) })}</p>
        </div>

        <table className="mt-6 w-full text-sm">
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-2 pr-2">
                {tDoc("invoiceLine", {
                  number: invoice.invoice_number,
                  date: formatDate(invoice.issue_date, locale),
                  due: formatDate(invoice.due_date, locale),
                })}
              </td>
              <td className="py-2 text-right whitespace-nowrap">{formatCurrency(amount)}</td>
            </tr>
            {fee > 0 && (
              <tr>
                <td className="py-2 pr-2">{tDoc("feeLine")}</td>
                <td className="py-2 text-right whitespace-nowrap">{formatCurrency(fee)}</td>
              </tr>
            )}
            <tr className="font-bold border-t-2 border-slate-300">
              <td className="py-2 pr-2">{tDoc("totalDue")}</td>
              <td className="py-2 text-right whitespace-nowrap">{formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6 text-sm text-slate-700 space-y-2">
          <p>{tDoc("payBy", { date: formatDate(payBy, locale) })}</p>
          {organization.iban && (
            <dl className="text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 max-w-sm">
              {organization.bank_name && (
                <>
                  <dt className="text-slate-500">{tInvDoc("docBank")}</dt>
                  <dd className="font-semibold">{organization.bank_name}</dd>
                </>
              )}
              <dt className="text-slate-500">{tInvDoc("docIban")}</dt>
              <dd className="font-semibold font-mono break-all">{organization.iban}</dd>
              {organization.bic && (
                <>
                  <dt className="text-slate-500">{tInvDoc("docBic")}</dt>
                  <dd className="font-semibold font-mono">{organization.bic}</dd>
                </>
              )}
            </dl>
          )}
          <p className="pt-4">{tDoc("closing")}</p>
          <p className="font-semibold">{organization.name}</p>
        </div>

        <footer className="mt-12 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
          <span>{organization.name}</span>
          {organization.tax_number && (
            <span>
              {tInvDoc("docTaxNumber")}: {organization.tax_number}
            </span>
          )}
          {organization.vat_id && (
            <span>
              {tInvDoc("docVatId")}: {organization.vat_id}
            </span>
          )}
        </footer>
      </article>
    </div>
  );
}
