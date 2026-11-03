import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { PrintButton } from "@/components/invoices/print-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("certificate");
  return { title: `${t("title")} • Sprachschul-Manager` };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
}

type AttendanceRow = {
  lessons: {
    lesson_date: string;
    duration_hours: number | string;
    course_id: string | null;
    courses: { name: string } | null;
  } | null;
};

/** Simple (non-official) attendance certificate, printable / PDF via browser. */
export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const [{ id }, sp, organization, membership, t, locale] = await Promise.all([
    params,
    searchParams,
    getActiveOrganization(),
    getCurrentMembership(),
    getTranslations("certificate"),
    getLocale(),
  ]);

  if (membership?.role === "teacher") redirect("/my-portal");
  if (!organization) notFound();

  const today = berlinToday();
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : `${today.slice(0, 4)}-01-01`;
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : today;

  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!student) notFound();

  const { data } = await supabase
    .from("attendance")
    .select("lessons(lesson_date, duration_hours, course_id, courses(name))")
    .eq("organization_id", organization.id)
    .eq("student_id", student.id)
    .eq("status", "present");

  const rows = ((data || []) as unknown as AttendanceRow[])
    .map((r) => r.lessons)
    .filter((l): l is NonNullable<AttendanceRow["lessons"]> => !!l && l.lesson_date >= from && l.lesson_date <= to);

  const byCourse = new Map<string, { name: string; count: number; hours: number }>();
  for (const l of rows) {
    const key = l.course_id || "none";
    const cur = byCourse.get(key) || { name: l.courses?.name || t("noCourse"), count: 0, hours: 0 };
    cur.count += 1;
    cur.hours += Number(l.duration_hours || 0);
    byCourse.set(key, cur);
  }
  const courseRows = [...byCourse.values()].sort((a, b) => a.name.localeCompare(b.name));
  const totalCount = courseRows.reduce((s, c) => s + c.count, 0);
  const totalHours = courseRows.reduce((s, c) => s + c.hours, 0);
  const hoursFmt = (h: number) => (Math.round(h * 100) / 100).toLocaleString(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "de-DE");

  return (
    <div className="max-w-[210mm] mx-auto space-y-4 print:space-y-0 print:max-w-none">
      <div className="space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/students"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-10 space-x-2 dark:border-slate-700 dark:text-slate-200")}
          >
            <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("back")}</span>
          </Link>
          <PrintButton />
        </div>
        <form method="GET" className="flex flex-col sm:flex-row sm:items-end gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">{t("from")}</Label>
            <Input id="from" name="from" type="date" defaultValue={from} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">{t("to")}</Label>
            <Input id="to" name="to" type="date" defaultValue={to} required />
          </div>
          <Button type="submit" variant="outline">{t("apply")}</Button>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("hint")}</p>
      </div>

      {/* Paper: always white, so print looks the same in dark mode */}
      <article className="bg-white text-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-12 print:border-0 print:shadow-none print:rounded-none print:p-0 min-h-[120mm]">
        <header className="text-center space-y-1">
          {organization.logo_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={organization.logo_url} alt={organization.name} className="h-14 w-auto object-contain mx-auto mb-2" />
          )}
          <p className="font-semibold text-slate-900">{organization.name}</p>
          {(organization.address_street || organization.address_city) && (
            <p className="text-xs text-slate-600">
              {organization.address_street}, {organization.address_zip} {organization.address_city}
            </p>
          )}
        </header>

        <h1 className="mt-12 text-center text-2xl font-bold tracking-wide text-slate-900">{t("title")}</h1>

        <p className="mt-10 text-sm leading-relaxed text-slate-800">
          {t("text", {
            name: `${student.first_name} ${student.last_name}`,
            from: formatDate(from, locale),
            to: formatDate(to, locale),
          })}
        </p>

        {courseRows.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">{t("noAttendance")}</p>
        ) : (
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-2 font-semibold">{t("course")}</th>
                <th className="py-2 pr-2 font-semibold text-right">{t("lessons")}</th>
                <th className="py-2 font-semibold text-right">{t("hours")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {courseRows.map((c) => (
                <tr key={c.name}>
                  <td className="py-2 pr-2">{c.name}</td>
                  <td className="py-2 pr-2 text-right">{c.count}</td>
                  <td className="py-2 text-right">{hoursFmt(c.hours)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-slate-300">
                <td className="py-2 pr-2">{t("total")}</td>
                <td className="py-2 pr-2 text-right">{totalCount}</td>
                <td className="py-2 text-right">{hoursFmt(totalHours)}</td>
              </tr>
            </tbody>
          </table>
        )}

        <div className="mt-16 grid grid-cols-2 gap-10 text-xs text-slate-600">
          <div>
            <p>
              {organization.address_city ? `${organization.address_city}, ` : ""}
              {formatDate(today, locale)}
            </p>
          </div>
          <div className="border-t border-slate-400 pt-1 text-center">{t("signature")}</div>
        </div>
      </article>
    </div>
  );
}
