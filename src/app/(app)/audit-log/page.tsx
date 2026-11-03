import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { History } from "lucide-react";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("auditLog");
  return { title: `${t("title")} • Sprachschul-Manager` };
}

const TABLES = ["invoices", "monthly_payments", "students", "teachers", "student_courses", "student_sepa_mandates"] as const;
const PAGE_SIZE = 200;

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "–";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string }>;
}) {
  const [sp, organization, membership, t, locale] = await Promise.all([
    searchParams,
    getActiveOrganization(),
    getCurrentMembership(),
    getTranslations("auditLog"),
    getLocale(),
  ]);

  if (membership?.role === "teacher") redirect("/my-portal");
  if (!organization) return <CreateOrganizationCard />;

  const table = (TABLES as readonly string[]).includes(sp.table || "") ? sp.table! : null;

  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (table) query = query.eq("table_name", table);
  const { data, error } = await query;
  const rows = data || [];

  const intlLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";
  const when = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(iso));
  const tableLabel = (name: string) => ((TABLES as readonly string[]).includes(name) ? t(`table_${name}`) : name);
  const actionVariant = { INSERT: "success", UPDATE: "warning", DELETE: "secondary" } as const;

  const changes = (r: (typeof rows)[number]) => {
    const source = r.action === "DELETE" ? r.old_data : r.new_data;
    if (!source) return [];
    return Object.entries(source)
      .filter(([k]) => !["organization_id", "created_at", "updated_at"].includes(k) || r.action === "UPDATE")
      .slice(0, 12)
      .map(([k, v]) => ({
        key: k,
        text: r.action === "UPDATE" ? `${formatValue(r.old_data?.[k])} → ${formatValue(v)}` : formatValue(v),
      }));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center space-x-3">
        <History strokeWidth={1.5} className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t("subtitle", { count: PAGE_SIZE })}</p>
        </div>
      </div>

      <form method="GET" className="flex items-center gap-2">
        <select
          name="table"
          defaultValue={table || ""}
          className="h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm"
        >
          <option value="">{t("allTables")}</option>
          {TABLES.map((name) => (
            <option key={name} value={name}>
              {t(`table_${name}`)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-md border border-slate-300 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {t("filter")}
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-800 dark:text-amber-300">
          {t("notAvailable")}
        </div>
      ) : rows.length === 0 ? (
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
                  <th className="px-4 py-3 font-semibold">{t("when")}</th>
                  <th className="px-4 py-3 font-semibold">{t("who")}</th>
                  <th className="px-4 py-3 font-semibold">{t("what")}</th>
                  <th className="px-4 py-3 font-semibold">{t("changes")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top text-slate-800 dark:text-slate-200">
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{when(r.created_at)}</td>
                    <td className="px-4 py-3 text-xs">{r.actor_email || t("system")}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Badge variant={actionVariant[r.action]} className="text-[10px] px-1.5 py-0 font-normal">
                          {t(`action_${r.action}`)}
                        </Badge>
                        <span className="text-xs">{tableLabel(r.table_name)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <dl className="space-y-0.5">
                        {changes(r).map((c) => (
                          <div key={c.key} className="flex gap-2">
                            <dt className="text-slate-500 dark:text-slate-400 shrink-0">{c.key}:</dt>
                            <dd className="font-mono break-all">{c.text}</dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={actionVariant[r.action]} className="text-[10px] px-1.5 py-0 font-normal">
                      {t(`action_${r.action}`)}
                    </Badge>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{tableLabel(r.table_name)}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{when(r.created_at)}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{r.actor_email || t("system")}</p>
                <dl className="text-xs space-y-0.5 text-slate-800 dark:text-slate-200">
                  {changes(r).map((c) => (
                    <div key={c.key} className="flex gap-2">
                      <dt className="text-slate-500 dark:text-slate-400 shrink-0">{c.key}:</dt>
                      <dd className="font-mono break-all">{c.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
