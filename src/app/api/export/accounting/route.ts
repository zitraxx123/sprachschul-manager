import { NextResponse, type NextRequest } from "next/server";
import { createClient, getActiveOrganization, getCurrentMembership } from "@/lib/supabase/server";
import { calculateLessonPayroll } from "@/lib/payroll";
import { csvDate, csvMoney, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** CSV export for the tax advisor: ?type=invoices|payouts&from=YYYY-MM&to=YYYY-MM */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type");
  const from = sp.get("from") || "";
  const to = sp.get("to") || from;

  if ((type !== "invoices" && type !== "payouts") || !MONTH_RE.test(from) || !MONTH_RE.test(to) || from > to) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const [organization, membership] = await Promise.all([getActiveOrganization(), getCurrentMembership()]);
  if (!organization || !membership || !["owner", "admin"].includes(membership.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  let csv: string;

  if (type === "invoices") {
    const { data, error } = await supabase
      .from("invoices")
      .select("invoice_number, issue_date, due_date, month_year, recipient_name, student_name, net_amount, vat_rate, vat_amount, total_amount, status, paid_at")
      .eq("organization_id", organization.id)
      .gte("month_year", from)
      .lte("month_year", to)
      .order("invoice_seq", { ascending: true });
    if (error) return new NextResponse("Error", { status: 500 });

    const statusLabel = { open: "offen", paid: "bezahlt", cancelled: "storniert" } as Record<string, string>;
    csv = toCsv(
      ["Rechnungsnummer", "Rechnungsdatum", "Faelligkeit", "Leistungsmonat", "Empfaenger", "Schueler", "Netto", "USt-Satz", "USt", "Brutto", "Status", "Bezahlt am"],
      (data || []).map((i) => [
        i.invoice_number,
        csvDate(i.issue_date),
        csvDate(i.due_date),
        i.month_year,
        i.recipient_name,
        i.student_name,
        csvMoney(i.net_amount),
        csvMoney(i.vat_rate),
        csvMoney(i.vat_amount),
        csvMoney(i.total_amount),
        statusLabel[i.status] || i.status,
        csvDate(i.paid_at),
      ])
    );
  } else {
    const [lessonsRes, teachersRes] = await Promise.all([
      supabase
        .from("lessons")
        .select("teacher_id, duration_hours, lesson_date, status, courses(course_type)")
        .eq("organization_id", organization.id)
        .gte("lesson_date", `${from}-01`)
        .lte("lesson_date", monthEnd(to)),
      supabase.from("teachers").select("*").eq("organization_id", organization.id).order("name", { ascending: true }),
    ]);
    if (lessonsRes.error || teachersRes.error) return new NextResponse("Error", { status: 500 });

    const teachers = teachersRes.data || [];
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const employmentLabel = { honorar: "Honorar", minijob: "Minijob", teilzeit: "Teilzeit" } as Record<string, string>;

    const agg = new Map<string, { month: string; teacherId: string; hours: number; amount: number }>();
    for (const l of lessonsRes.data || []) {
      const month = l.lesson_date.slice(0, 7);
      const key = `${month}|${l.teacher_id}`;
      const payroll = calculateLessonPayroll(
        Number(l.duration_hours || 0),
        (l as unknown as { courses?: { course_type?: string } | null }).courses?.course_type,
        teacherById.get(l.teacher_id),
        l.status,
        organization.late_cancellation_pay_percent ?? 50
      );
      const cur = agg.get(key) || { month, teacherId: l.teacher_id, hours: 0, amount: 0 };
      cur.hours += Number(l.duration_hours || 0);
      cur.amount += payroll.totalAmount;
      agg.set(key, cur);
    }

    const rows = [...agg.values()].sort((a, b) =>
      a.month === b.month
        ? (teacherById.get(a.teacherId)?.name || "").localeCompare(teacherById.get(b.teacherId)?.name || "")
        : a.month.localeCompare(b.month)
    );
    csv = toCsv(
      ["Monat", "Lehrkraft", "Beschaeftigungsart", "Steuer-ID", "Stunden", "Betrag (EUR)"],
      rows.map((r) => {
        const t = teacherById.get(r.teacherId);
        return [
          r.month,
          t?.name || "",
          employmentLabel[t?.employment_type || "honorar"] || t?.employment_type || "",
          t?.tax_id || "",
          r.hours.toFixed(2).replace(".", ","),
          csvMoney(r.amount),
        ];
      })
    );
  }

  const filename = `${type === "invoices" ? "rechnungen" : "honorare"}-${from}${to !== from ? `_${to}` : ""}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
