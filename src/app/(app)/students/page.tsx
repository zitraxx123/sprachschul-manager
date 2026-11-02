import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AddStudentDialog } from "@/components/students/add-student-dialog";
import { ImportDataDialog } from "@/components/import/import-data-dialog";
import { StudentActions } from "@/components/students/student-actions";
import { StudentProfileDialog } from "@/components/students/student-profile-dialog";
import { CourseInfoDialog, CourseInfoData } from "@/components/courses/course-info-dialog";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, User, Mail, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { Course, CourseSchedule } from "@/types/database";
import { getTranslations, getLocale } from "next-intl/server";

export const metadata = {
  title: "Schüler & Monatsabos • Sprachschul-Manager",
};

export default async function StudentsPage() {
  const [teacher, membership, organization, tStudents, tCourses, locale] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("students"),
    getTranslations("courses"),
    getLocale(),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const supabase = await createClient();

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const intlLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";
  const currentMonthLabel = now.toLocaleDateString(intlLocale, { month: "long", year: "numeric" });

  // Parallel fetch: Students, Courses, and Monthly Payments
  const [studentsResult, coursesResult, paymentsResult] = await Promise.all([
    supabase
      .from("students")
      .select("*, student_courses(*, courses(*, teachers(*), course_schedules(*)))")
      .eq("organization_id", organization.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("courses")
      .select("*, teachers(*), rooms(*), course_schedules(*)")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => {
        if (res.error) {
          return supabase
            .from("courses")
            .select("*, teachers(*), course_schedules(*)")
            .eq("organization_id", organization.id)
            .order("name", { ascending: true });
        }
        return res;
      }),
    supabase
      .from("monthly_payments")
      .select("*")
      .eq("organization_id", organization.id)
      .eq("month_year", currentMonthYear),
  ]);

  const students = studentsResult.data || [];
  const rawCourses = coursesResult.data || [];
  const monthlyPayments = paymentsResult.data || [];

  const courses = rawCourses as unknown as Array<Course & { teachers?: { name: string; phone?: string | null; email?: string | null } | null; rooms?: { name: string } | null; course_schedules?: CourseSchedule[] }>;

  const paymentMap = new Map((monthlyPayments || []).map((p) => [p.student_id, p]));

  // Compute stats
  const totalStudents = students?.length || 0;
  const paidStudents = (students || []).filter((s) => paymentMap.get(s.id)?.is_paid);
  const paidCount = paidStudents.length;
  const unpaidCount = totalStudents - paidCount;

  const totalRevenue = (monthlyPayments || [])
    .filter((p) => p.is_paid)
    .reduce((sum, p) => sum + Number(p.amount_euro || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tStudents("title")} • {organization.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tStudents("subtitle")} ({currentMonthLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ImportDataDialog buttonLabel="Excel-Import" />
          <AddStudentDialog courses={courses || []} />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tStudents("statusActive")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tStudents("paidTitle")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {paidCount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({formatCurrency(totalRevenue)})</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tStudents("unpaidTitle")} ({currentMonthLabel})</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{unpaidCount}</p>
          </div>
        </div>
      </div>

      {/* Students Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {tStudents("title")} ({totalStudents})
          </CardTitle>
          <CardDescription>
            {tStudents("subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={tStudents("emptyTitle")}
              description={tStudents("emptyDesc")}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ImportDataDialog buttonLabel="Excel-Import" />
                <AddStudentDialog courses={courses || []} />
              </div>
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tStudents("name")}</TableHead>
                      <TableHead>{tStudents("parent")}</TableHead>
                      <TableHead>{tStudents("course")}</TableHead>
                      <TableHead>{tStudents("status")} ({currentMonthLabel})</TableHead>
                      <TableHead className="text-right">{tStudents("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const payment = paymentMap.get(student.id);
                      const isPaid = !!payment?.is_paid;

                      const studentCoursesList = (
                        (student as unknown as { student_courses?: Array<{ status?: string; courses: CourseInfoData }> }).student_courses || []
                      );
                      const enrolledCourses: CourseInfoData[] = studentCoursesList
                        .map((sc) => sc.courses)
                        .filter(Boolean);
                      const enrolledEntries = studentCoursesList
                        .filter((sc) => Boolean(sc.courses))
                        .map((sc) => ({
                          course: sc.courses,
                          status: (sc.status || "active") as "active" | "trial" | "waiting",
                        }));

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <StudentProfileDialog
                              student={student}
                              courses={enrolledCourses}
                              payment={payment}
                              currentMonthYear={currentMonthYear}
                            >
                              <div className="flex items-center space-x-2 text-left group">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                                  {student.first_name.charAt(0)}
                                  {student.last_name.charAt(0)}
                                </div>
                                <div>
                                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block font-bold leading-tight">
                                    {student.first_name} {student.last_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center space-x-0.5">
                                    <span>{tStudents("viewRecord")}</span>
                                    <span>&rarr;</span>
                                  </span>
                                </div>
                              </div>
                            </StudentProfileDialog>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                            <div className="space-y-1">
                              {student.email && (
                                <div className="flex items-center space-x-2">
                                  <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                                  <a href={`mailto:${student.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 truncate">{student.email}</a>
                                </div>
                              )}
                              {student.phone && (
                                <div className="flex items-center space-x-2">
                                  <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                                  <a href={`tel:${student.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-mono font-semibold">{student.phone}</a>
                                </div>
                              )}
                              {!student.email && !student.phone && !student.parent_name && <span>—</span>}

                              {/* Parent contact information */}
                              {(student.parent_name || student.parent_phone || student.parent_email) && (
                                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-col text-[11px] bg-slate-50/80 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-1">
                                    <Users strokeWidth={1.5} className="w-4 h-4 text-blue-500 mr-1 shrink-0" />
                                    <span>{tStudents("parent")}: <strong>{student.parent_name || "—"}</strong></span>
                                  </span>
                                  <div className="flex items-center space-x-2 mt-0.5 text-slate-500 dark:text-slate-400">
                                    {student.parent_phone && (
                                      <a
                                        href={`tel:${student.parent_phone}`}
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center space-x-1 font-semibold"
                                        title={tStudents("call")}
                                      >
                                        <Phone strokeWidth={1.5} className="w-3.5 h-3.5" />
                                        <span>{student.parent_phone}</span>
                                      </a>
                                    )}
                                    {student.parent_email && (
                                      <a
                                        href={`mailto:${student.parent_email}`}
                                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title={tStudents("sendMail")}
                                      >
                                        <Mail strokeWidth={1.5} className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {enrolledEntries.length > 0 ? (
                              <div className="flex flex-wrap gap-2 max-w-xs">
                                {enrolledEntries.map(({ course: c, status }) => (
                                  <CourseInfoDialog key={c.id} course={c}>
                                    <button
                                      type="button"
                                      className={`inline-flex items-center text-[11px] font-medium py-1 px-2.5 rounded-lg border transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer ${
                                        status === "trial"
                                          ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800 hover:bg-amber-100"
                                          : status === "waiting"
                                          ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:bg-slate-200"
                                          : c.course_type === "individual"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100/90 dark:hover:bg-emerald-900/60"
                                          : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100/90 dark:hover:bg-blue-900/60"
                                      }`}
                                      title={c.name}
                                    >
                                      {c.course_type === "individual" ? (
                                        <User strokeWidth={1.5} className="w-4 h-4 mr-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      ) : (
                                        <Users strokeWidth={1.5} className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-400 shrink-0" />
                                      )}
                                      <span className="font-semibold">{c.name}</span>
                                      {status === "trial" ? (
                                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                          {tStudents("statusTrial")}
                                        </span>
                                      ) : status === "waiting" ? (
                                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-500 text-white shadow-2xs">
                                          {tStudents("statusWaiting")}
                                        </span>
                                      ) : (
                                        <span className="ml-1 text-[10px] opacity-75 font-normal">
                                          ({c.course_type === "individual" ? tCourses("individual") : tCourses("group")})
                                        </span>
                                      )}
                                    </button>
                                  </CourseInfoDialog>
                                ))}
                              </div>
                            ) : student.course_name ? (
                              <span className="text-xs text-slate-600 font-medium">
                                {student.course_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">{tStudents("unassigned")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <Badge variant="success" className="space-x-1 py-1 font-medium">
                                <CheckCircle2 strokeWidth={1.5} className="w-4 h-4" />
                                <span>{tStudents("paymentRecorded")} ({formatCurrency(Number(payment?.amount_euro || 0))})</span>
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="space-x-1 py-1 font-medium">
                                <AlertCircle strokeWidth={1.5} className="w-4 h-4" />
                                <span>{tStudents("paymentDue")}</span>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <StudentActions 
                              student={student}
                              courses={courses || []}
                              assignedCourseIds={((student as unknown as { student_courses?: Array<{ course_id: string }> }).student_courses || []).map((sc) => sc.course_id)}
                              enrolledCourseDetails={enrolledCourses}
                              payment={payment}
                              currentMonthYear={currentMonthYear}
                              isAlreadyPaid={isPaid}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Native Card View (Shown on screens < md) */}
              <div className="md:hidden space-y-3">
                {students.map((student) => {
                  const payment = paymentMap.get(student.id);
                  const isPaid = !!payment?.is_paid;

                  const studentCoursesList = (
                    (student as unknown as { student_courses?: Array<{ status?: string; courses: CourseInfoData }> }).student_courses || []
                  );
                  const enrolledCourses: CourseInfoData[] = studentCoursesList
                    .map((sc) => sc.courses)
                    .filter(Boolean);
                  const enrolledEntries = studentCoursesList
                    .filter((sc) => Boolean(sc.courses))
                    .map((sc) => ({
                      course: sc.courses,
                      status: (sc.status || "active") as "active" | "trial" | "waiting",
                    }));

                  return (
                    <div 
                      key={student.id} 
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <StudentProfileDialog
                          student={student}
                          courses={enrolledCourses}
                          payment={payment}
                          currentMonthYear={currentMonthYear}
                        >
                          <div className="flex items-center space-x-3 min-w-0 text-left">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                              {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight truncate">
                                {student.first_name} {student.last_name}
                              </h3>
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                                {tStudents("viewRecord")} &rarr;
                              </span>
                            </div>
                          </div>
                        </StudentProfileDialog>

                        <div className="shrink-0">
                          {isPaid ? (
                            <Badge variant="success" className="py-1 px-2 text-xs font-semibold whitespace-nowrap">
                              <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 mr-1" />
                              <span>{formatCurrency(Number(payment?.amount_euro || 0))}</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="py-1 px-2 text-xs font-semibold whitespace-nowrap">
                              <AlertCircle strokeWidth={1.5} className="w-4 h-4 mr-1" />
                              <span>{tStudents("paymentDue")}</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Direct Student Contact on Mobile */}
                      <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        {student.phone && (
                          <a href={`tel:${student.phone}`} className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-mono">
                            <Phone strokeWidth={1.5} className="w-4 h-4 shrink-0" />
                            <span>{student.phone}</span>
                          </a>
                        )}
                        {student.email && (
                          <a href={`mailto:${student.email}`} className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                            <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </a>
                        )}
                      </div>

                      {/* Parent Contact Box on Mobile */}
                      {(student.parent_name || student.parent_phone || student.parent_email) && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                              <Users strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-1 shrink-0" />
                              <span>{tStudents("parent")}: {student.parent_name || "—"}</span>
                            </span>
                            {student.parent_phone && (
                              <a
                                href={`tel:${student.parent_phone}`}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                {tStudents("call")} 📞
                              </a>
                            )}
                          </div>
                          {student.parent_email && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              ✉️ {student.parent_email}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Enrolled Courses with Clickable Info Dialog on Mobile */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-400 mr-1">{tCourses("title")}:</span>
                        {enrolledEntries.length > 0 ? (
                          enrolledEntries.map(({ course: c, status }) => (
                            <CourseInfoDialog key={c.id} course={c}>
                              <button
                                type="button"
                                className={`inline-flex items-center text-[10px] font-medium py-0.5 px-2 rounded-md border ${
                                  status === "trial"
                                    ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800"
                                    : status === "waiting"
                                    ? "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                                    : c.course_type === "individual"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                {c.course_type === "individual" ? (
                                  <User strokeWidth={1.5} className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Users strokeWidth={1.5} className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                                )}
                                <span className="font-semibold">{c.name}</span>
                                {status === "trial" ? (
                                  <span className="ml-1 px-1 py-0.1 rounded text-[9px] font-bold bg-amber-500 text-white shadow-2xs">
                                    {tStudents("statusTrial")}
                                  </span>
                                ) : status === "waiting" ? (
                                  <span className="ml-1 px-1 py-0.1 rounded text-[9px] font-bold bg-slate-500 text-white shadow-2xs">
                                    {tStudents("statusWaiting")}
                                  </span>
                                ) : (
                                  <span className="ml-1 opacity-70">
                                    ({c.course_type === "individual" ? tCourses("individual") : tCourses("group")})
                                  </span>
                                )}
                              </button>
                            </CourseInfoDialog>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">{tStudents("unassigned")}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <StudentProfileDialog
                          student={student}
                          courses={enrolledCourses}
                          payment={payment}
                          currentMonthYear={currentMonthYear}
                        >
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            {tStudents("studentRecord")} &rarr;
                          </span>
                        </StudentProfileDialog>

                        <StudentActions 
                          student={student}
                          courses={courses || []}
                          assignedCourseIds={((student as unknown as { student_courses?: Array<{ course_id: string }> }).student_courses || []).map((sc) => sc.course_id)}
                          enrolledCourseDetails={enrolledCourses}
                          payment={payment}
                          currentMonthYear={currentMonthYear}
                          isAlreadyPaid={isPaid}
                        />
                      </div>
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
