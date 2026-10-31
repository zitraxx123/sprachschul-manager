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

export const metadata = {
  title: "Schüler & Monatsabos • Sprachschul-Manager",
};

export default async function StudentsPage() {
  const [teacher, membership, organization] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
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
  const currentMonthLabel = now.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

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
            Schüler &amp; Monatsabos (Monatsbeiträge)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verwaltung von Teilnehmern, Kurszuweisungen und Zahlungsstatus für {currentMonthLabel}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ImportDataDialog buttonLabel="Daten importieren" />
          <AddStudentDialog courses={courses || []} />
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aktive Schüler</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Beitrag bezahlt</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {paidCount} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({formatCurrency(totalRevenue)})</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Offene Beiträge ({currentMonthLabel})</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{unpaidCount}</p>
          </div>
        </div>
      </div>

      {/* Students Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Alle Schüler &amp; Teilnehmer ({totalStudents})
          </CardTitle>
          <CardDescription>
            Klicken Sie auf den Namen für die vollständige Schülerakte oder auf die Kurs-Plakette für Kursdetails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Noch keine Schüler angelegt"
              description="Erfassen Sie Ihre ersten Kursteilnehmer, um Anwesenheiten zu führen und Monatsbeiträge zu überwachen."
            >
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <ImportDataDialog buttonLabel="Daten importieren" />
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
                      <TableHead>Schüler (Akte)</TableHead>
                      <TableHead>Kontakt &amp; Eltern</TableHead>
                      <TableHead>Kurs &amp; Gruppe (Klick für Details)</TableHead>
                      <TableHead>Status ({currentMonthLabel})</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const payment = paymentMap.get(student.id);
                      const isPaid = !!payment?.is_paid;

                      const enrolledCourses: CourseInfoData[] = (
                        (student as unknown as { student_courses?: Array<{ courses: CourseInfoData }> }).student_courses || []
                      )
                        .map((sc) => sc.courses)
                        .filter(Boolean);

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                            <StudentProfileDialog
                              student={student}
                              courses={enrolledCourses}
                              payment={payment}
                              currentMonthYear={currentMonthYear}
                            >
                              <div className="flex items-center space-x-2.5 text-left group">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center group-hover:ring-2 group-hover:ring-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                                  {student.first_name.charAt(0)}
                                  {student.last_name.charAt(0)}
                                </div>
                                <div>
                                  <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors block font-bold leading-tight">
                                    {student.first_name} {student.last_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center space-x-0.5">
                                    <span>Akte anzeigen</span>
                                    <span>&rarr;</span>
                                  </span>
                                </div>
                              </div>
                            </StudentProfileDialog>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                            <div className="space-y-1">
                              {student.email && (
                                <div className="flex items-center space-x-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <a href={`mailto:${student.email}`} className="hover:text-blue-600 dark:hover:text-blue-400 truncate">{student.email}</a>
                                </div>
                              )}
                              {student.phone && (
                                <div className="flex items-center space-x-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <a href={`tel:${student.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400 font-mono font-semibold">{student.phone}</a>
                                </div>
                              )}
                              {!student.email && !student.phone && !student.parent_name && <span>—</span>}

                              {/* Parent contact information */}
                              {(student.parent_name || student.parent_phone || student.parent_email) && (
                                <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex flex-col text-[11px] bg-slate-50/80 dark:bg-slate-800/80 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center space-x-1">
                                    <Users className="w-3 h-3 text-blue-500 mr-1 shrink-0" />
                                    <span>Eltern: <strong>{student.parent_name || "Kontakt"}</strong></span>
                                  </span>
                                  <div className="flex items-center space-x-2 mt-0.5 text-slate-500 dark:text-slate-400">
                                    {student.parent_phone && (
                                      <a
                                        href={`tel:${student.parent_phone}`}
                                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center space-x-1 font-semibold"
                                        title="Eltern anrufen"
                                      >
                                        <Phone className="w-2.5 h-2.5" />
                                        <span>{student.parent_phone}</span>
                                      </a>
                                    )}
                                    {student.parent_email && (
                                      <a
                                        href={`mailto:${student.parent_email}`}
                                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title="E-Mail an Eltern senden"
                                      >
                                        <Mail className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {enrolledCourses.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {enrolledCourses.map((c) => (
                                  <CourseInfoDialog key={c.id} course={c}>
                                    <button
                                      type="button"
                                      className={`inline-flex items-center text-[11px] font-medium py-1 px-2.5 rounded-lg border transition-all active:scale-95 shadow-2xs hover:shadow-xs cursor-pointer ${
                                        c.course_type === "individual"
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/90"
                                          : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100/90"
                                      }`}
                                      title="Klicken für Kursdetails &amp; Dozenteninfo"
                                    >
                                      {c.course_type === "individual" ? (
                                        <User className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                                      ) : (
                                        <Users className="w-3 h-3 mr-1 text-blue-600 shrink-0" />
                                      )}
                                      <span className="font-semibold">{c.name}</span>
                                      <span className="ml-1 text-[10px] opacity-75 font-normal">
                                        ({c.course_type === "individual" ? "1:1 Einzel" : "Gruppe"})
                                      </span>
                                    </button>
                                  </CourseInfoDialog>
                                ))}
                              </div>
                            ) : student.course_name ? (
                              <span className="text-xs text-slate-600 font-medium">
                                {student.course_name}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Keine Kurse</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <Badge variant="success" className="space-x-1 py-1 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Bezahlt ({formatCurrency(Number(payment?.amount_euro || 0))})</span>
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="space-x-1 py-1 font-medium">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Offen (Nicht bezahlt)</span>
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

                  const enrolledCourses: CourseInfoData[] = (
                    (student as unknown as { student_courses?: Array<{ courses: CourseInfoData }> }).student_courses || []
                  )
                    .map((sc) => sc.courses)
                    .filter(Boolean);

                  return (
                    <div 
                      key={student.id} 
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
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
                                Akte öffnen &rarr;
                              </span>
                            </div>
                          </div>
                        </StudentProfileDialog>

                        <div className="shrink-0">
                          {isPaid ? (
                            <Badge variant="success" className="py-1 px-2 text-xs font-semibold whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              <span>{formatCurrency(Number(payment?.amount_euro || 0))}</span>
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="py-1 px-2 text-xs font-semibold whitespace-nowrap">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              <span>Offen</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Direct Student Contact on Mobile */}
                      <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                        {student.phone && (
                          <a href={`tel:${student.phone}`} className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-mono">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{student.phone}</span>
                          </a>
                        )}
                        {student.email && (
                          <a href={`mailto:${student.email}`} className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{student.email}</span>
                          </a>
                        )}
                      </div>

                      {/* Parent Contact Box on Mobile */}
                      {(student.parent_name || student.parent_phone || student.parent_email) && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mr-1 shrink-0" />
                              <span>Eltern: {student.parent_name || "Hinterlegt"}</span>
                            </span>
                            {student.parent_phone && (
                              <a
                                href={`tel:${student.parent_phone}`}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950"
                              >
                                Anrufen 📞
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
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-slate-400 mr-1">Kurse:</span>
                        {enrolledCourses.length > 0 ? (
                          enrolledCourses.map((c) => (
                            <CourseInfoDialog key={c.id} course={c}>
                              <button
                                type="button"
                                className={`inline-flex items-center text-[10px] font-medium py-0.5 px-2 rounded-md border ${
                                  c.course_type === "individual"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                {c.course_type === "individual" ? (
                                  <User className="w-2.5 h-2.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Users className="w-2.5 h-2.5 mr-1 text-blue-600 dark:text-blue-400" />
                                )}
                                <span className="font-semibold">{c.name}</span>
                                <span className="ml-1 opacity-70">
                                  ({c.course_type === "individual" ? "Einzel" : "Gruppe"})
                                </span>
                              </button>
                            </CourseInfoDialog>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Keine Kurse zugeordnet</span>
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
                            Vollständige Akte öffnen &rarr;
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
