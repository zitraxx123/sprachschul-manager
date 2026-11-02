import Link from "next/link";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/portal/print-button";
import { CourseWithStudents } from "@/components/portal/weekly-calendar";
import { DynamicWeeklyCalendar } from "@/components/portal/dynamic-weekly-calendar";
import { GoogleCalendarIcon } from "@/components/portal/google-calendar-icon";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { calculateLessonPayroll } from "@/lib/payroll";
import { Course, Student } from "@/types/database";
import { 
  Clock, 
  Euro, 
  GraduationCap, 
  CheckCircle2, 
  UserX,
  Calendar
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

interface MyPortalPageProps {
  searchParams: Promise<{ month?: string }>;
}

export const metadata = {
  title: "Mein Dozenten-Portal • Sprachschul-Manager",
};

export default async function MyPortalPage({ searchParams }: MyPortalPageProps) {
  const { month: selectedMonthParam } = await searchParams;

  const [organization, teacher, tPortal, tCommon, tLessons, locale] = await Promise.all([
    getActiveOrganization(),
    getCurrentTeacher(),
    getTranslations("portal"),
    getTranslations("common"),
    getTranslations("lessons"),
    getLocale(),
  ]);

  if (!organization || !teacher) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8">
          <GraduationCap strokeWidth={1.5} className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tPortal("noProfileTitle")}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
            {tPortal("noProfileDesc", { org: organization?.name || "" })}
          </p>
          <Link href="/dashboard" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
            {tPortal("backToOverview")}
          </Link>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();

  const jsLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";

  // Active month calculation
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  const selectedDate = new Date(`${activeMonth}-01`);
  const monthNameYear = selectedDate.toLocaleDateString(jsLocale, {
    month: "long",
    year: "numeric",
  });
  const todayFormatted = new Date().toLocaleDateString(jsLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Month selector choices (past 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(jsLocale, { month: "long", year: "numeric" });
    return { value, label };
  });

  type RawTeacherCourse = Course & {
    rooms?: { id?: string; name: string } | null;
    student_courses?: Array<{ status?: "active" | "trial" | "waiting"; students?: Student }>;
    course_schedules?: import("@/types/database").CourseSchedule[];
  };

  // Parallel fetch: teacher courses, teacher lessons, and teacher names for substitution labels
  const [coursesResult, lessonsResult, allTeachersResult] = await Promise.all([
    supabase
      .from("courses")
      .select("*, rooms(*), course_schedules(*), student_courses(*, students(*))")
      .eq("teacher_id", teacher.id)
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => {
        if (res.error) {
          return supabase
            .from("courses")
            .select("*, course_schedules(*), student_courses(*, students(*))")
            .eq("teacher_id", teacher.id)
            .eq("organization_id", organization.id)
            .order("name", { ascending: true });
        }
        return res;
      }),
    supabase
      .from("lessons")
      .select("*, courses(*)")
      .eq("teacher_id", teacher.id)
      .order("lesson_date", { ascending: false }),
    supabase
      .from("teachers")
      .select("id, name")
      .eq("organization_id", organization.id),
  ]);

  const rawTeacherCourses = (coursesResult.data as unknown as RawTeacherCourse[]) || [];
  const allLessons = lessonsResult.data || [];
  const allTeachersMap = new Map((allTeachersResult.data || []).map((t) => [t.id, t.name]));

  const teacherCourses = (rawTeacherCourses || []).map((c) => {
    const enrolledStudents = (c.student_courses || [])
      .filter((sc) => Boolean(sc.students))
      .map((sc) => ({
        ...sc.students!,
        enrollment_status: (sc.status || "active") as "active" | "trial" | "waiting",
      }));
    return {
      ...c,
      students: enrolledStudents,
      rooms: c.rooms || null,
      course_schedules: c.course_schedules || [],
    };
  });

  // Filter lessons for the chosen month
  const monthlyLessons = (allLessons || []).filter((l) =>
    l.lesson_date.startsWith(activeMonth)
  );

  // Calculate monthly stats with specialized rates (individual vs group vs flat)
  const totalHours = monthlyLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );
  
  const totalEarnings = monthlyLessons.reduce((sum, l) => {
    const calc = calculateLessonPayroll(
      Number(l.duration_hours || 0),
      (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
      teacher,
      l.status,
      organization.late_cancellation_pay_percent ?? 50
    );
    return sum + calc.totalAmount;
  }, 0);
  const hourlyRate = Number(teacher.hourly_rate);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* 1. Official Print Document Header (Visible ONLY when printing / downloading PDF) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            {organization.logo_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-14 w-auto max-w-[160px] object-contain shrink-0"
              />
            )}
            <div>
              <span className="text-[11px] uppercase font-bold tracking-widest text-slate-500">
                {tPortal("printDocProof")}
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">{organization.name}</h1>
              <p className="text-xs text-slate-500">{tPortal("printSchoolDesc")}</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-700 space-y-1">
            <div>{tPortal("printMonth")} <strong className="text-slate-900 text-sm">{monthNameYear}</strong></div>
            <div>{tPortal("printDate")} <strong className="text-slate-900">{todayFormatted}</strong></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">{tPortal("printTeacherLabel")}</span>
            <span className="text-base font-bold text-slate-900">{teacher.name}</span>
            {teacher.email && <span className="text-slate-500 block">{teacher.email}</span>}
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">{tPortal("printContractRate")}</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(hourlyRate)} / {tCommon("hourShort")}</span>
          </div>
        </div>
      </div>

      {/* 2. Welcome & Teacher Header (Hidden on print) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {tPortal("welcomeTitle", { name: teacher.name })}
              </h1>
              <Badge variant="success" className="text-xs">
                {tCommon("teacher")}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tPortal("schoolLabel", { org: organization.name })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/absences">
            <Badge variant="outline" className="cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-3 border-slate-200 dark:border-slate-700 flex items-center space-x-2">
              <UserX strokeWidth={1.5} className="w-4 h-4 text-rose-500" />
              <span>{tPortal("absencesReportButton")}</span>
            </Badge>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* 3. Interactive Weekly Calendar (Swipeable on mobile, dynamic SSR-free import) */}
      <DynamicWeeklyCalendar
        courses={teacherCourses as CourseWithStudents[]}
        teacherId={teacher.id}
        teacherName={teacher.name}
        lateCancellationHours={organization.late_cancellation_hours ?? 24}
        lateCancellationPayPercent={organization.late_cancellation_pay_percent ?? 50}
      />

      {/* 4. Monthly Payroll Summary Card */}
      <Card className="border-blue-200 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-900 dark:to-slate-850/60 print:hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-2 mb-1">
              <Euro strokeWidth={1.5} className="w-4 h-4" />
              <span>{tPortal("monthlyPayrollTitle")}</span>
            </span>
            <CardTitle className="text-xl">
              {tPortal("feesForMonth", { month: monthNameYear })}
            </CardTitle>
            <CardDescription>
              {tPortal("feesForMonthDesc")}
            </CardDescription>
          </div>

          {/* Month selector dropdown buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {monthOptions.map((opt) => (
              <Link
                key={opt.value}
                href={`/my-portal?month=${opt.value}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeMonth === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{tPortal("taughtHoursCard")}</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{tCommon("hours")}</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{tPortal("unitsInMonth", { count: monthlyLessons.length, month: monthNameYear })}</p>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                <Euro strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{tPortal("baseRateCard")}</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {formatCurrency(hourlyRate)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {(teacher.rate_group || teacher.rate_individual) ? tPortal("differentiatedRatesActive") : tPortal("flatRatePerHour")}
              </p>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md">
              <span className="text-xs text-blue-100 font-medium flex items-center space-x-2">
                <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-blue-200" />
                <span>{tPortal("payoutAmountCard")}</span>
              </span>
              <div className="text-3xl font-extrabold mt-2">
                {formatCurrency(totalEarnings)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1">
                {tPortal("calculatedForUnits", { count: monthlyLessons.length })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Detailed Monthly Lessons Table Card */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <div>
            <CardTitle className="text-base font-semibold">
              {tPortal("lessonsProof", { count: monthlyLessons.length })}
            </CardTitle>
            <CardDescription>
              {tPortal("lessonsProofDesc", { month: monthNameYear })}
            </CardDescription>
          </div>
          <PrintButton />
        </CardHeader>
        <CardContent className="print:p-0">
          {monthlyLessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={tPortal("noLessonsInMonth", { month: monthNameYear })}
              description={tPortal("noLessonsInMonthDesc")}
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="print:border-slate-300">
                      <TableHead>{tCommon("date")}</TableHead>
                      <TableHead>{tLessonsProofHeaderStudent(tCommon)}</TableHead>
                      <TableHead>{tLessons("statusLabel")}</TableHead>
                      <TableHead>{tCommon("duration")}</TableHead>
                      <TableHead>{tPortal("colCalculation")}</TableHead>
                      <TableHead className="text-right">{tPortal("colRemuneration")}</TableHead>
                      <TableHead>{tCommon("notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyLessons.map((lesson) => {
                      const calc = calculateLessonPayroll(
                        Number(lesson.duration_hours || 0),
                        (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                        teacher,
                        lesson.status,
                        organization.late_cancellation_pay_percent ?? 50
                      );

                      const lessonGcalUrl = buildGoogleCalendarUrl({
                        text: lesson.student_name || tPortal("groupShort"),
                        date: lesson.lesson_date,
                        startTime: "09:00",
                        durationHours: Number(lesson.duration_hours) || 1.5,
                        details: `Dozent: ${teacher.name}\nNotizen: ${lesson.notes || "—"}`,
                        location: organization.name,
                      });

                      return (
                        <TableRow key={lesson.id} className="print:border-slate-200">
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span>{formatDate(lesson.lesson_date, locale)}</span>
                              <a
                                href={lessonGcalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="print:hidden text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded transition-colors"
                                title={tPortal("addToGoogle")}
                                aria-label={tPortal("addToGoogle")}
                              >
                                <GoogleCalendarIcon className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                            <div>
                              <span>{lesson.student_name || "—"}</span>
                              {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {tPortal("individualLessonBadge")}
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400">
                                  {tPortal("groupLessonBadge")}
                                </span>
                              )}
                              {lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 print:bg-transparent print:text-black border border-amber-300 dark:border-amber-800 print:border-black px-1.5 py-0.5 rounded">
                                    {tPortal("substitutionBadge", { teacher: allTeachersMap.get(lesson.original_teacher_id) || "" })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lesson.status === "cancelled_by_student" ? (
                              <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[10px]">
                                {tLessons("statusCancelledByStudent")}
                              </Badge>
                            ) : lesson.status === "cancelled_late" ? (
                              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold text-[10px]">
                                {tLessons("statusCancelledLate")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px]">
                                {tLessons("statusCompleted")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="print:bg-transparent print:border-none print:p-0 print:font-semibold">
                              {lesson.duration_hours} {tCommon("hours")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400 font-mono text-xs">
                            <div>
                              <span>{formatCurrency(calc.rateUsed)}</span>
                              <span className="block text-[10px] text-slate-400 font-sans">{calc.rateDescription}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 dark:text-emerald-400 print:text-black">
                            {formatCurrency(calc.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate print:max-w-none print:whitespace-normal">
                            {lesson.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100 font-semibold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">
                        {tPortal("totalSum", { month: monthNameYear })}
                      </TableCell>
                      <TableCell className="font-bold">
                        {totalHours.toFixed(1)} {tCommon("hours")}
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs italic">
                        {tPortal("individualRates")}
                      </TableCell>
                      <TableCell className="text-right font-black text-base text-emerald-700 dark:text-emerald-400 print:text-black">
                        {formatCurrency(totalEarnings)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {monthlyLessons.length} {monthlyLessons.length === 1 ? tPortal("unitSingular") : tPortal("unitsCount", { count: monthlyLessons.length })}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Mobile Card View (No horizontal scrolling on phones) */}
              <div className="md:hidden space-y-3">
                {monthlyLessons.map((lesson) => {
                  const calc = calculateLessonPayroll(
                    Number(lesson.duration_hours || 0),
                    (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                    teacher,
                    lesson.status,
                    organization.late_cancellation_pay_percent ?? 50
                  );

                  const lessonGcalUrl = buildGoogleCalendarUrl({
                    text: lesson.student_name || tPortal("groupShort"),
                    date: lesson.lesson_date,
                    startTime: "09:00",
                    durationHours: Number(lesson.duration_hours) || 1.5,
                    details: `Dozent: ${teacher.name}\nNotizen: ${lesson.notes || "—"}`,
                    location: organization.name,
                  });

                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 font-medium text-slate-700 dark:text-slate-300">
                          <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(lesson.lesson_date, locale)}</span>
                          <a
                            href={lessonGcalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 rounded transition-colors"
                            title={tPortal("addToGoogle")}
                            aria-label={tPortal("addToGoogle")}
                          >
                            <GoogleCalendarIcon className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <div className="flex items-center space-x-2">
                          {lesson.status === "cancelled_by_student" ? (
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[10px]">
                              {tLessons("statusCancelledByStudent")}
                            </Badge>
                          ) : lesson.status === "cancelled_late" ? (
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold text-[10px]">
                              {tLessons("statusCancelledLate")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px]">
                              {tLessons("statusCompleted")}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {lesson.duration_hours} {tCommon("hours")}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {lesson.student_name || tPortal("groupShort")}
                          </h4>
                          {lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded mt-1">
                              {tPortal("substitutionBadge", { teacher: allTeachersMap.get(lesson.original_teacher_id) || "" })}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400 block">
                            {formatCurrency(calc.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatCurrency(calc.rateUsed)} / {calc.rateDescription}
                          </span>
                        </div>
                      </div>

                      {lesson.notes && (
                        <p className="text-xs text-slate-500 italic pt-1.5 border-t border-slate-100 dark:border-slate-800 truncate">
                          &quot;{lesson.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Mobile Monthly Total Strip */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{tPortal("totalSum", { month: monthNameYear })}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{totalHours.toFixed(1)} {tCommon("hours")} • {monthlyLessons.length} {tCommon("lessons")}</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 6. Official Print Document Footer & Signatures (Visible ONLY in print) */}
      <div className="hidden print:block mt-8 pt-4 text-xs">
        <div className="flex justify-between items-center mb-6 bg-slate-100 p-4 rounded-lg border border-slate-300">
          <span className="text-sm font-bold text-slate-900">{tPortal("printTotalPayout")}</span>
          <span className="text-xl font-black text-slate-900">{formatCurrency(totalEarnings)}</span>
        </div>
        <p className="text-slate-500 italic mb-14">
          {tPortal("printConfirmation")}
        </p>
        <div className="grid grid-cols-2 gap-16 pt-8">
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            {tPortal("printTeacherSignature", { name: teacher.name })}
          </div>
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            {tPortal("printSchoolSignature", { org: organization.name })}
          </div>
        </div>
      </div>
    </div>
  );
}

function tLessonsProofHeaderStudent(tCommon: (key: string) => string): string {
  return `${tCommon("course")} / ${tCommon("student")}`;
}
