import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateLessonPayroll } from "@/lib/payroll";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { contractCoversMonth } from "@/lib/contracts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { CourseWithFullDetails } from "@/components/dashboard/school-weekly-schedule";
import { DynamicSchoolSchedule } from "@/components/dashboard/dynamic-school-schedule";
import type { LessonOverride } from "@/lib/schedule";
import { 
  FinancialOverview, 
  MonthlyFinancialRecord, 
  DebtorStudent 
} from "@/components/dashboard/financial-overview";
import { ImportDataDialog } from "@/components/import/import-data-dialog";
import { Users, BookOpen, Euro, Plus, ArrowRight, UserCheck, Calendar as CalendarIcon } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard • Klasswerk",
};

export default async function DashboardPage() {
  // Parallel fetch auth context and translations
  const [teacher, membership, organization, tDash, tCommon, tLessons, locale] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("dashboard"),
    getTranslations("common"),
    getTranslations("lessons"),
    getLocale(),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (membership?.role === "assistant") {
    redirect("/students");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const supabase = await createClient();

  // Lessons and payments are only needed for the 6-month trend (this month + 5 earlier ones)
  const trendStartDate = new Date();
  trendStartDate.setDate(1);
  trendStartDate.setMonth(trendStartDate.getMonth() - 5);
  const trendStartMonth = `${trendStartDate.getFullYear()}-${String(trendStartDate.getMonth() + 1).padStart(2, "0")}`;

  // Parallel fetch all dashboard data via Promise.all
  const [
    teachersResult,
    lessonsResult,
    coursesResult,
    attendanceResult,
    paymentsResult,
    studentsResult,
    overridesResult
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    fetchAll((from, to) =>
      supabase
        .from("lessons")
        .select("*, teachers!lessons_teacher_id_fkey(*), courses(*)")
        .eq("organization_id", organization.id)
        .gte("lesson_date", `${trendStartMonth}-01`)
        .order("lesson_date", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("courses")
      .select("*, teachers(*), rooms(*), course_schedules(*), student_courses(*, students(id, first_name, last_name, email, phone, parent_name, parent_phone))")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => {
        if (res.error) {
          return supabase
            .from("courses")
            .select("*, teachers(*), course_schedules(*), student_courses(*, students(id, first_name, last_name, email, phone, parent_name, parent_phone))")
            .eq("organization_id", organization.id)
            .order("name", { ascending: true });
        }
        return res;
      }),
    fetchAll((from, to) =>
      supabase
        .from("attendance")
        .select("lesson_id, student_id, status, students(id, first_name, last_name, phone, email), lessons(lesson_date, course_id)")
        .eq("organization_id", organization.id)
        .eq("status", "absent")
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("monthly_payments")
        .select("*")
        .eq("organization_id", organization.id)
        .gte("month_year", trendStartMonth)
        .order("id")
        .range(from, to)
    ),
    fetchAll((from, to) =>
      supabase
        .from("students")
        .select("id, first_name, last_name, email, phone, custom_monthly_price, student_courses(course_id, status, contract_start, contract_end, courses(id, name, monthly_price))")
        .eq("organization_id", organization.id)
        .order("first_name", { ascending: true })
        .order("id")
        .range(from, to)
    ),
    // One-off schedule exceptions (moved lessons / substitutes): last 90 days and all future
    supabase
      .from("lesson_overrides")
      .select("*")
      .eq("organization_id", organization.id)
      .gte("lesson_date", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  ]);

  const teachers = teachersResult.data || [];
  const lessons = lessonsResult.data || [];
  const rawCourses = coursesResult.data || [];
  const attendanceData = attendanceResult.data || [];
  const allPayments = paymentsResult.data || [];
  const students = studentsResult.data || [];
  const scheduleOverrides = (overridesResult.data || []) as LessonOverride[];

  // Compute statistics for current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthLessons = (lessons || []).filter((l) =>
    l.lesson_date.startsWith(currentYearMonth)
  );

  const totalMonthHours = currentMonthLessons.reduce(
    (sum, l) => sum + (l.status === "cancelled_by_student" ? 0 : Number(l.duration_hours || 0)),
    0
  );

  // Map teachers by id for quick lookup
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

  // Calculate total payroll for current month
  const totalMonthPayroll = currentMonthLessons.reduce((sum, l) => {
    const t = teacherMap.get(l.teacher_id);
    const calc = calculateLessonPayroll(
      Number(l.duration_hours || 0),
      (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
      t,
      l.status,
      organization.late_cancellation_pay_percent ?? 50
    );
    return sum + calc.totalAmount;
  }, 0);

  // Aggregate monthly hours & earnings per teacher
  const teacherStats = (teachers || []).map((t) => {
    const tLessons = currentMonthLessons.filter((l) => l.teacher_id === t.id);
    const hours = tLessons.reduce((sum, l) => sum + (l.status === "cancelled_by_student" ? 0 : Number(l.duration_hours || 0)), 0);
    const earnings = tLessons.reduce((sum, l) => {
      const calc = calculateLessonPayroll(
        Number(l.duration_hours || 0),
        (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
        t,
        l.status,
        organization.late_cancellation_pay_percent ?? 50
      );
      return sum + calc.totalAmount;
    }, 0);
    return {
      ...t,
      monthHours: hours,
      monthEarnings: earnings,
      lessonCount: tLessons.length,
    };
  });

  const recentLessons = (lessons || []).slice(0, 5);

  // Format attendance records with absences to mark missed lessons in Wochenplan
  const absencesList: Array<{
    lessonDate: string;
    courseId: string;
    studentId: string;
    studentName: string;
    studentPhone?: string | null;
    studentEmail?: string | null;
    status: string;
  }> = [];

  (attendanceData || []).forEach((row: unknown) => {
    const item = row as {
      student_id: string;
      status: string;
      students?: { id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null };
      lessons?: { lesson_date: string; course_id: string };
    };

    if (item.lessons?.course_id && item.lessons?.lesson_date) {
      absencesList.push({
        lessonDate: item.lessons.lesson_date,
        courseId: item.lessons.course_id,
        studentId: item.student_id,
        studentName: item.students
          ? `${item.students.first_name} ${item.students.last_name}`
          : tCommon("student"),
        studentPhone: item.students?.phone,
        studentEmail: item.students?.email,
        status: item.status,
      });
    }
  });

  // Compute financial analytics
  const intlLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";
  const currentMonthLabel = now.toLocaleDateString(intlLocale, { month: "long", year: "numeric" });

  // 1. Current month income from monthly_payments
  const currentMonthPaidRecords = allPayments.filter(
    (p) => p.month_year === currentYearMonth && p.is_paid === true
  );
  const currentMonthIncome = currentMonthPaidRecords.reduce(
    (sum, p) => sum + Number(p.amount_euro || 0),
    0
  );
  const currentMonthExpenses = totalMonthPayroll;
  const currentMonthProfit = currentMonthIncome - currentMonthExpenses;

  // 2. 6-Month Trend Data for BarChart
  const monthlyData: MonthlyFinancialRecord[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const ym = `${y}-${m}`;
    const monthLabel = d.toLocaleDateString(intlLocale, { month: "short" });

    const mIncome = allPayments
      .filter((p) => p.month_year === ym && p.is_paid === true)
      .reduce((sum, p) => sum + Number(p.amount_euro || 0), 0);

    const mLessons = (lessons || []).filter((l) => l.lesson_date.startsWith(ym));
    const mExpenses = mLessons.reduce((sum, l) => {
      const t = teacherMap.get(l.teacher_id);
      const calc = calculateLessonPayroll(
        Number(l.duration_hours || 0),
        (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
        t,
        l.status,
        organization.late_cancellation_pay_percent ?? 50
      );
      return sum + calc.totalAmount;
    }, 0);

    monthlyData.push({
      month: ym,
      monthLabel,
      income: mIncome,
      expenses: mExpenses,
      profit: mIncome - mExpenses,
    });
  }

  // 3. Debtors list (unpaid students for the current month)
  const paidStudentIds = new Set(
    allPayments
      .filter((p) => p.month_year === currentYearMonth && p.is_paid === true)
      .map((p) => p.student_id)
  );

  const currentMonthPaymentMap = new Map(
    allPayments
      .filter((p) => p.month_year === currentYearMonth)
      .map((p) => [p.student_id, p])
  );

  // Only students that actually owe money this month: an active enrollment whose contract runs in the month
  // (trial / waiting-list / ended contracts do not count), or an already issued, unpaid payment record.
  type DebtorEnrollment = {
    status?: string | null;
    contract_start?: string | null;
    contract_end?: string | null;
    courses?: { id: string; name: string; monthly_price?: number | null } | null;
  };

  const debtors: DebtorStudent[] = students
    .filter((s) => !paidStudentIds.has(s.id))
    .map((s) => {
      const scList = ((s as unknown as { student_courses?: DebtorEnrollment[] }).student_courses || []);
      const billable = scList.filter(
        (sc) =>
          sc.status === "active" &&
          sc.courses &&
          contractCoversMonth({ contractStart: sc.contract_start ?? null, contractEnd: sc.contract_end ?? null }, currentYearMonth)
      );
      const courseNames = billable.map((sc) => sc.courses!.name);

      let amountDue = 0;
      if (billable.length > 0) {
        amountDue =
          s.custom_monthly_price !== null && s.custom_monthly_price !== undefined
            ? Number(s.custom_monthly_price)
            : billable.reduce((sum, sc) => sum + Number(sc.courses?.monthly_price || 0), 0);
      }

      const existingPayment = currentMonthPaymentMap.get(s.id);
      if (existingPayment && Number(existingPayment.amount_euro) > 0) {
        amountDue = Number(existingPayment.amount_euro);
      }

      return {
        id: s.id,
        studentId: s.id,
        name: `${s.first_name} ${s.last_name}`,
        email: s.email,
        phone: s.phone,
        courses: courseNames,
        amountDue,
      };
    })
    .filter((d) => d.amountDue > 0);

  return (
    <div className="space-y-8 max-w-[1600px] w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tDash("title")} • {organization.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tDash("scheduleDesc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ImportDataDialog buttonLabel={tDash("importData")} />
          <Link href="/courses">
            <Button variant="outline" size="sm" className="space-x-2 shadow-sm">
              <Plus strokeWidth={1.5} className="w-4 h-4" />
              <span>{tDash("newCourse")}</span>
            </Button>
          </Link>
          <Link href="/lessons">
            <Button size="sm" className="space-x-2 shadow-sm">
              <Plus strokeWidth={1.5} className="w-4 h-4" />
              <span>{tDash("recordLesson")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Setup guide for new schools (hides itself when done or dismissed) */}
      <OnboardingChecklist
        organizationId={organization.id}
        steps={[
          { key: "teacher", done: teachers.length > 0, href: "/teachers" },
          { key: "course", done: rawCourses.length > 0, href: "/courses" },
          { key: "student", done: students.length > 0, href: "/students" },
          { key: "lesson", done: lessons.length > 0, href: "/lessons" },
          {
            key: "billing",
            done:
              !!(organization.address_street?.trim() && organization.address_zip?.trim() && organization.address_city?.trim()) &&
              !!(organization.tax_number?.trim() || organization.vat_id?.trim()),
            href: "/settings",
          },
        ]}
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {tDash("activeTeachers")}
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users strokeWidth={1.5} className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{teachers.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tDash("activeTeachersSub")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {tDash("totalHours")}
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen strokeWidth={1.5} className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalMonthHours.toFixed(1)} {tCommon("hours")}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tDash("totalHoursSub")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {tDash("payrollTotal")}
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Euro strokeWidth={1.5} className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalMonthPayroll)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tDash("payrollTotalSub")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Left = Schedule (Wochenplan), Right = Finanzen (Finanzübersicht) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Weekly Schedule */}
        <div className="xl:col-span-7 2xl:col-span-8 space-y-6">
          <DynamicSchoolSchedule
            courses={(rawCourses || []) as unknown as CourseWithFullDetails[]}
            teachers={teachers || []}
            absences={absencesList}
            overrides={scheduleOverrides}
          />
        </div>

        {/* Right Column: Finanzen / Finanzübersicht */}
        <div className="xl:col-span-5 2xl:col-span-4 space-y-6">
          <FinancialOverview
            currentMonthIncome={currentMonthIncome}
            currentMonthExpenses={currentMonthExpenses}
            currentMonthProfit={currentMonthProfit}
            monthlyData={monthlyData}
            debtors={debtors}
            currentMonthYear={currentYearMonth}
            currentMonthLabel={currentMonthLabel}
            schoolName={organization.name}
          />
          <UpcomingBirthdays teachers={teachers || []} />
        </div>
      </div>

      {/* Teachers List Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{tDash("teacherOverview")}</CardTitle>
            <CardDescription>
              {tDash("teacherOverviewDesc")}
            </CardDescription>
          </div>
          <Link href="/teachers">
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 space-x-1 text-xs">
              <span>{tDash("viewAll")}</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {teacherStats.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title={tDash("noTeachers")}
              description={tDash("teacherOverviewDesc")}
              action={{
                label: tDash("newTeacher"),
                icon: Plus,
              }}
            >
              <Link href="/teachers">
                <Button size="sm" className="space-x-1">
                  <Plus strokeWidth={1.5} className="w-4 h-4" />
                  <span>{tDash("newTeacher")}</span>
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("name")}</TableHead>
                      <TableHead>{tCommon("email")}</TableHead>
                      <TableHead>{tDash("rate")}</TableHead>
                      <TableHead>{tDash("totalHours")}</TableHead>
                      <TableHead className="text-right">{tDash("earnings")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherStats.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                          {item.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(Number(item.hourly_rate))} / {tCommon("hourShort")}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                          {item.monthHours.toFixed(1)} {tCommon("hours")} ({item.lessonCount})
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.monthEarnings)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/teachers/${item.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs">
                              {tCommon("details")}
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (No horizontal scrolling on phones) */}
              <div className="md:hidden space-y-3">
                {teacherStats.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{t.name}</h4>
                        {t.email && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{t.email}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {formatCurrency(Number(t.hourly_rate))}/{tCommon("hourShort")}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{tDash("completed")}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {t.monthHours.toFixed(1)} {tCommon("hourShort")} ({t.lessonCount})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{tLessons("fee")}:</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(t.monthEarnings)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link href={`/teachers/${t.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs space-x-1">
                          <span>{tDash("detailsAndPayroll")}</span>
                          <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Lessons Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{tDash("recentLessons")}</CardTitle>
            <CardDescription>{tDash("recentLessonsDesc")}</CardDescription>
          </div>
          <Link href="/lessons">
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 space-x-1 text-xs">
              <span>{tDash("viewAll")}</span>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentLessons.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={tDash("noLessons")}
              description={tDash("recentLessonsDesc")}
            >
              <Link href="/lessons">
                <Button size="sm" className="space-x-2">
                  <Plus strokeWidth={1.5} className="w-4 h-4" />
                  <span>{tDash("recordLesson")}</span>
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tDash("date")}</TableHead>
                      <TableHead>{tDash("teacher")}</TableHead>
                      <TableHead>{tCommon("students")} / {tCommon("courses")}</TableHead>
                      <TableHead>{tDash("duration")}</TableHead>
                      <TableHead>{tCommon("notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLessons.map((lesson) => {
                      const t = teacherMap.get(lesson.teacher_id);
                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDate(lesson.lesson_date, locale)}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                            {t?.name || tLessons("unknownTeacher")}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 text-xs">
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              <span>{lesson.student_name || "—"}</span>
                              {lesson.status === "cancelled_by_student" ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                                  {tLessons("statusCancelledByStudent")}
                                </Badge>
                              ) : lesson.status === "cancelled_late" ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold">
                                  {tLessons("statusCancelledLate")}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{lesson.duration_hours} {tCommon("hourShort")}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-400 dark:text-slate-500 text-xs truncate max-w-xs">
                            {lesson.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (No horizontal scrolling on phones) */}
              <div className="md:hidden space-y-3">
                {recentLessons.map((lesson) => {
                  const t = teacherMap.get(lesson.teacher_id);
                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 font-medium">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{formatDate(lesson.lesson_date, locale)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {lesson.duration_hours} {tCommon("hourShort")}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                          {lesson.student_name || tLessons("defaultLessonTitle")}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {tCommon("teacher")}: <strong className="text-slate-700 dark:text-slate-300">{t?.name || tLessons("unknownTeacher")}</strong>
                        </p>
                      </div>

                      {lesson.notes && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic pt-1 border-t border-slate-100 dark:border-slate-800 truncate">
                          &quot;{lesson.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
