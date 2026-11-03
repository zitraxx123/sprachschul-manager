import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateLessonPayroll } from "@/lib/payroll";
import { deleteTeacher } from "@/actions/teachers";
import { EditTeacherDialog } from "@/components/teachers/edit-teacher-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/components/portal/print-button";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Euro, 
  Trash2, 
  Mail, 
  Phone, 
  Cake, 
  Users, 
  UserCheck, 
  BookOpen, 
  Calculator 
} from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

interface TeacherDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}

export default async function TeacherDetailPage({
  params,
  searchParams,
}: TeacherDetailPageProps) {
  const [
    currentTeacher,
    membership,
    organization,
    resolvedParams,
    resolvedSearchParams,
    tTeachers,
    tCourses,
    tLessons,
    tCommon,
    locale
  ] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    params,
    searchParams,
    getTranslations("teachers"),
    getTranslations("courses"),
    getTranslations("lessons"),
    getTranslations("common"),
    getLocale(),
  ]);

  if (currentTeacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  const { id: teacherId } = resolvedParams;
  const { month: selectedMonthParam } = resolvedSearchParams;

  if (!organization) return null;

  const supabase = await createClient();

  // Parallel fetch: Teacher details, all teacher lessons, and all teacher names for substitutions
  const [teacherResult, lessonsResult, allTeachersResult] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("id", teacherId)
      .eq("organization_id", organization.id)
      .single(),
    supabase
      .from("lessons")
      .select("*, courses(*)")
      .eq("teacher_id", teacherId)
      .eq("organization_id", organization.id)
      .order("lesson_date", { ascending: false }),
    supabase
      .from("teachers")
      .select("id, name")
      .eq("organization_id", organization.id),
  ]);

  const teacher = teacherResult.data;
  const allTeachersMap = new Map((allTeachersResult.data || []).map((t) => [t.id, t.name]));

  if (!teacher) {
    notFound();
  }

  const intlLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";

  // Determine active month (default: current YYYY-MM)
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  const allTeacherLessons = lessonsResult.data || [];
  const monthlyLessons = (allTeacherLessons || []).filter((l) =>
    l.lesson_date.startsWith(activeMonth)
  );

  // Calculate Payroll: Sum of specialized rates per lesson
  const totalHours = monthlyLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );
  const hourlyRate = Number(teacher.hourly_rate);
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

  // Available months for quick filter (last 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString(intlLocale, { month: "long", year: "numeric" });
    return { value, label };
  });

  const selectedDate = new Date(`${activeMonth}-01`);
  const monthNameYear = selectedDate.toLocaleDateString(intlLocale, {
    month: "long",
    year: "numeric",
  });
  const todayFormatted = new Date().toLocaleDateString(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  async function handleDelete() {
    "use server";
    await deleteTeacher(teacherId);
    redirect("/teachers");
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Official Print Document Header (Visible ONLY in print) */}
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
                {tTeachers("teacherDetailTitle")}
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">{organization.name}</h1>
            </div>
          </div>
          <div className="text-right text-xs text-slate-700 space-y-1">
            <div>{tCommon("month")}: <strong className="text-slate-900 text-sm">{monthNameYear}</strong></div>
            <div>{tCommon("date")}: <strong className="text-slate-900">{todayFormatted}</strong></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">{tCommon("teacher")}:</span>
            <span className="text-base font-bold text-slate-900">{teacher.name}</span>
            {teacher.email && <span className="text-slate-500 block">{teacher.email}</span>}
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">{tTeachers("contractRate")}:</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(hourlyRate)} / {tCommon("hourShort")}</span>
          </div>
        </div>
      </div>

      {/* Top Navigation & Profile Header */}
      <div className="print:hidden">
        <Link
          href="/teachers"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4 mr-1" />
          <span>{tCommon("back")}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{teacher.name}</h1>
                <Badge variant="outline" className="text-xs">{tCommon("teacher")}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {teacher.email && (
                  <span className="flex items-center space-x-1">
                    <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${teacher.email}`} className="hover:underline">{teacher.email}</a>
                  </span>
                )}
                {teacher.phone && (
                  <span className="flex items-center space-x-1">
                    <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <a href={`tel:${teacher.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">{teacher.phone}</a>
                  </span>
                )}
                {teacher.birthday && (
                  <span className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 font-medium">
                    <Cake strokeWidth={1.5} className="w-4 h-4 text-amber-600" />
                    <span>{formatDate(teacher.birthday, locale)}</span>
                  </span>
                )}
                <span className="flex items-center space-x-1">
                  <Euro strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{tTeachers("baseRate")}: <strong>{formatCurrency(hourlyRate)} / {tCommon("hourShort")}</strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <EditTeacherDialog teacher={teacher} variant="button" />
            <PrintButton />
            <form action={handleDelete}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              >
                <Trash2 strokeWidth={1.5} className="w-4 h-4 mr-1.5" />
                <span>{tCommon("delete")}</span>
              </Button>
            </form>
          </div>
        </div>

        {/* Honorarsätze Strip (if specialized rates are configured) */}
        {(teacher.rate_group || teacher.rate_individual || teacher.rate_45 || teacher.rate_60 || teacher.rate_90) && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 mr-1">
              <Euro strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{tTeachers("advancedRatesToggle")}:</span>
            </span>
            <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono">
              {tTeachers("baseRate")}: {formatCurrency(hourlyRate)}/{tCommon("hourShort")}
            </Badge>
            {teacher.rate_group && (
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                <Users strokeWidth={1.5} className="w-4 h-4 mr-1" />
                {tCourses("group")}: {formatCurrency(Number(teacher.rate_group))}/{tCommon("hourShort")}
              </Badge>
            )}
            {teacher.rate_individual && (
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
                <UserCheck strokeWidth={1.5} className="w-4 h-4 mr-1" />
                {tCourses("individual")}: {formatCurrency(Number(teacher.rate_individual))}/{tCommon("hourShort")}
              </Badge>
            )}
            {teacher.rate_45 && (
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono">
                <Clock strokeWidth={1.5} className="w-4 h-4 mr-1" />
                45 {tCommon("minuteShort")}: {formatCurrency(Number(teacher.rate_45))}
              </Badge>
            )}
            {teacher.rate_60 && (
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono">
                <Clock strokeWidth={1.5} className="w-4 h-4 mr-1" />
                60 {tCommon("minuteShort")}: {formatCurrency(Number(teacher.rate_60))}
              </Badge>
            )}
            {teacher.rate_90 && (
              <Badge variant="outline" className="bg-white dark:bg-slate-800 font-mono">
                <Clock strokeWidth={1.5} className="w-4 h-4 mr-1" />
                90 {tCommon("minuteShort")}: {formatCurrency(Number(teacher.rate_90))}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
          <span>{tCommon("month")}:</span>
        </div>

        <div className="flex items-center space-x-2">
          {monthOptions.map((opt) => (
            <Link
              key={opt.value}
              href={`/teachers/${teacher.id}?month=${opt.value}`}
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
      </div>

      {/* Basic Payroll Calculator Card */}
      <Card className="border-blue-200 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-900/60 print:hidden">
        <CardHeader>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-sm font-semibold">
            <Calculator strokeWidth={1.5} className="w-4 h-4" />
            <span>{tTeachers("payslipTitle")}</span>
          </div>
          <CardTitle className="text-xl">
            {monthNameYear}
          </CardTitle>
          <CardDescription>
            {tTeachers("calculationBasis")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{tTeachers("hoursDelivered")}</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500">{tCommon("hourShort")}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{monthlyLessons.length} {tTeachers("units")}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-2">
                <Euro strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                <span>{tTeachers("contractRate")}</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {formatCurrency(hourlyRate)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">60 {tCommon("minuteShort")}</p>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md">
              <span className="text-xs text-blue-100 font-medium flex items-center space-x-2">
                <Calculator strokeWidth={1.5} className="w-4 h-4 text-blue-200" />
                <span>{tTeachers("payoutTotal")}</span>
              </span>
              <div className="text-3xl font-extrabold mt-2">
                {formatCurrency(totalEarnings)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1 font-mono">
                {totalHours.toFixed(1)} {tCommon("hourShort")} × {formatCurrency(hourlyRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Details for this Month */}
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <div>
            <CardTitle className="text-base font-semibold">
              {tTeachers("lessonProof")} ({monthlyLessons.length} {tTeachers("units")})
            </CardTitle>
            <CardDescription>
              {monthNameYear}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <PrintButton />
            <Link href="/lessons">
              <Button variant="outline" size="sm" className="space-x-2">
                <BookOpen strokeWidth={1.5} className="w-4 h-4" />
                <span>{tTeachers("newLesson")}</span>
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="print:p-0">
          {monthlyLessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={tTeachers("noLessonsMonth")}
              description={tTeachers("noLessonsMonthDesc")}
            >
              <Link href="/lessons">
                <Button size="sm" className="space-x-2">
                  <BookOpen strokeWidth={1.5} className="w-4 h-4" />
                  <span>{tTeachers("recordLessonNow")}</span>
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="print:border-slate-300">
                      <TableHead>{tTeachers("date")}</TableHead>
                      <TableHead>{tTeachers("studentCourse")}</TableHead>
                      <TableHead>{tLessons("statusLabel")}</TableHead>
                      <TableHead>{tCommon("duration")}</TableHead>
                      <TableHead className="text-right">{tTeachers("payoutUnit")}</TableHead>
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

                      const originalTeacherName = lesson.original_teacher_id
                        ? allTeachersMap.get(lesson.original_teacher_id)
                        : null;
                      const isSubstitution = Boolean(
                        lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id
                      );

                      return (
                        <TableRow key={lesson.id} className="print:border-slate-200">
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDate(lesson.lesson_date, locale)}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">
                            <div>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{lesson.student_name || "—"}</span>
                              {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {tCourses("individual")}
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400">
                                  {tCourses("group")}
                                </span>
                              )}
                              {isSubstitution && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 print:bg-transparent print:text-black border border-amber-300 dark:border-amber-800 print:border-black px-1.5 py-0.5 rounded">
                                    ★ {originalTeacherName || tCommon("teacher")}
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
                              {lesson.duration_hours} {tCommon("hourShort")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">{formatCurrency(calc.totalAmount)}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {formatCurrency(calc.rateUsed)} ({calc.rateDescription})
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 max-w-xs truncate print:max-w-none print:whitespace-normal">
                            {lesson.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-slate-50 dark:bg-slate-800 print:bg-slate-100 font-semibold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        {tCommon("total")} ({monthNameYear})
                      </TableCell>
                      <TableCell className="font-bold">
                        {totalHours.toFixed(1)} {tCommon("hourShort")}
                      </TableCell>
                      <TableCell className="text-right font-black text-base text-emerald-700 dark:text-emerald-400 print:text-black">
                        {formatCurrency(totalEarnings)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {monthlyLessons.length} {tTeachers("units")}
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

                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 font-semibold text-slate-900 dark:text-slate-100">
                          <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                          <span>{formatDate(lesson.lesson_date, locale)}</span>
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
                            {lesson.duration_hours} {tCommon("hourShort")}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {lesson.student_name || "—"}
                          </h4>
                          {lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-1.5 py-0.5 rounded mt-1">
                              ★ {allTeachersMap.get(lesson.original_teacher_id) || tCommon("teacher")}
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block">
                            {formatCurrency(calc.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatCurrency(calc.rateUsed)} ({calc.rateDescription})
                          </span>
                        </div>
                      </div>

                      {lesson.notes && (
                        <p className="text-xs text-slate-400 italic pt-1.5 border-t border-slate-100 dark:border-slate-800 truncate">
                          &quot;{lesson.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Mobile Monthly Total Card */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">{tCommon("total")} ({monthNameYear})</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{totalHours.toFixed(1)} {tCommon("hourShort")} • {monthlyLessons.length} {tTeachers("units")}</span>
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

      {/* Official Print Document Footer & Signatures (Visible ONLY in print) */}
      <div className="hidden print:block mt-8 pt-4 text-xs">
        <div className="flex justify-between items-center mb-6 bg-slate-100 p-4 rounded-lg border border-slate-300">
          <span className="text-sm font-bold text-slate-900">{tTeachers("payoutTotal")}:</span>
          <span className="text-xl font-black text-slate-900">{formatCurrency(totalEarnings)}</span>
        </div>
        <p className="text-slate-500 italic mb-14">
          {tTeachers("signatureNote")}
        </p>
        <div className="grid grid-cols-2 gap-16 pt-8">
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            {tTeachers("signatureTeacher")} ({teacher.name})
          </div>
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            {tTeachers("signatureSchool")} ({organization.name})
          </div>
        </div>
      </div>
    </div>
  );
}
