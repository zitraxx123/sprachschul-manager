import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { UpcomingBirthdays } from "@/components/dashboard/upcoming-birthdays";
import { CourseWithFullDetails } from "@/components/dashboard/school-weekly-schedule";
import { DynamicSchoolSchedule } from "@/components/dashboard/dynamic-school-schedule";
import { ImportDataDialog } from "@/components/import/import-data-dialog";
import { Users, BookOpen, Euro, Plus, ArrowRight, UserCheck, Calendar as CalendarIcon } from "lucide-react";

export const metadata = {
  title: "Dashboard • Sprachschul-Manager",
};

export default async function DashboardPage() {
  // Parallel fetch auth context (cached per request)
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

  // Parallel fetch all dashboard data via Promise.all
  const [
    teachersResult,
    lessonsResult,
    coursesResult,
    attendanceResult
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("lessons")
      .select("*, teachers(*)")
      .eq("organization_id", organization.id)
      .order("lesson_date", { ascending: false }),
    supabase
      .from("courses")
      .select("*, teachers(*), rooms(*), course_schedules(*), student_courses(*, students(id, first_name, last_name, email, phone, parent_name, parent_phone))")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => {
        if (res.error) {
          // Fallback if rooms column is not yet migrated in database
          return supabase
            .from("courses")
            .select("*, teachers(*), course_schedules(*), student_courses(*, students(id, first_name, last_name, email, phone, parent_name, parent_phone))")
            .eq("organization_id", organization.id)
            .order("name", { ascending: true });
        }
        return res;
      }),
    supabase
      .from("attendance")
      .select("lesson_id, student_id, status, students(id, first_name, last_name, phone, email), lessons(lesson_date, course_id)")
      .eq("organization_id", organization.id)
      .eq("status", "absent")
  ]);

  const teachers = teachersResult.data || [];
  const lessons = lessonsResult.data || [];
  const rawCourses = coursesResult.data || [];
  const attendanceData = attendanceResult.data || [];

  // Compute statistics for current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthLessons = (lessons || []).filter((l) =>
    l.lesson_date.startsWith(currentYearMonth)
  );

  const totalMonthHours = currentMonthLessons.reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );

  // Map teachers by id for quick lookup
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));

  // Calculate total payroll for current month
  const totalMonthPayroll = currentMonthLessons.reduce((sum, l) => {
    const t = teacherMap.get(l.teacher_id);
    const rate = Number(t?.hourly_rate || 0);
    return sum + Number(l.duration_hours || 0) * rate;
  }, 0);

  // Aggregate monthly hours & earnings per teacher
  const teacherStats = (teachers || []).map((t) => {
    const tLessons = currentMonthLessons.filter((l) => l.teacher_id === t.id);
    const hours = tLessons.reduce((sum, l) => sum + Number(l.duration_hours || 0), 0);
    const earnings = hours * Number(t.hourly_rate);
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
          : "Schüler",
        studentPhone: item.students?.phone,
        studentEmail: item.students?.email,
        status: item.status,
      });
    }
  });

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Übersicht • {organization.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Wochenplan, Dozenten-Honorare und aktuelle Kennzahlen im Überblick.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ImportDataDialog buttonLabel="Daten importieren" />
          <Link href="/courses">
            <Button variant="outline" size="sm" className="space-x-1.5 shadow-2xs">
              <Plus className="w-4 h-4" />
              <span>Neuer Kurs</span>
            </Button>
          </Link>
          <Link href="/lessons">
            <Button size="sm" className="space-x-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Stunde erfassen</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Aktive Dozenten
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{teachers.length}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Erfasste Lehrkräfte im Schulsystem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Unterricht (Lfd. Monat)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{totalMonthHours.toFixed(1)} Std.</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {currentMonthLessons.length} gehaltene Einheiten im aktuellen Monat
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Honorare (Lfd. Monat)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Euro className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalMonthPayroll)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Berechnet aus Stundensätzen × gehaltenen Stunden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Big Weekly Plan Widget (Wochenplan) for School Owner / Admin */}
      <DynamicSchoolSchedule
        courses={(rawCourses || []) as unknown as CourseWithFullDetails[]}
        teachers={teachers || []}
        absences={absencesList}
      />

      {/* Teachers List Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Lehrkräfte &amp; Honorar-Vorschau</CardTitle>
            <CardDescription>
              Stundensätze und berechnetes Gehalt für den laufenden Monat
            </CardDescription>
          </div>
          <Link href="/teachers">
            <Button variant="ghost" size="sm" className="text-blue-600 space-x-1 text-xs">
              <span>Alle verwalten</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {teacherStats.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Noch keine Lehrkräfte angelegt"
              description="Legen Sie Ihren ersten Lehrer an, um Stundensätze und Honorarabrechnungen zu verwalten."
              action={{
                label: "Erste Lehrkraft anlegen",
                icon: Plus,
              }}
            >
              <Link href="/teachers">
                <Button size="sm" className="space-x-1">
                  <Plus className="w-4 h-4" />
                  <span>Lehrkraft hinzufügen</span>
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
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Stundensatz</TableHead>
                      <TableHead>Stunden (Monat)</TableHead>
                      <TableHead className="text-right">Gehalt (Monat)</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teacherStats.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                          {t.name}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                          {t.email || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{formatCurrency(Number(t.hourly_rate))} / Std.</Badge>
                        </TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                          {t.monthHours.toFixed(1)} Std. ({t.lessonCount} Einheiten)
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(t.monthEarnings)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/teachers/${t.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs">
                              Details
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
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{t.name}</h4>
                        {t.email && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{t.email}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="font-mono text-xs shrink-0">
                        {formatCurrency(Number(t.hourly_rate))}/Std.
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Geleistet:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {t.monthHours.toFixed(1)} Std. ({t.lessonCount} Einh.)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Honorar:</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(t.monthEarnings)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link href={`/teachers/${t.id}`}>
                        <Button variant="outline" size="sm" className="h-7 text-xs space-x-1">
                          <span>Details &amp; Abrechnung</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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
            <CardTitle className="text-base font-semibold">Zuletzt erfasste Unterrichtsstunden</CardTitle>
            <CardDescription>Die letzten 5 Unterrichtseinheiten Ihrer Schule</CardDescription>
          </div>
          <Link href="/lessons">
            <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 space-x-1 text-xs">
              <span>Alle Stunden</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentLessons.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="Noch keine Unterrichtsstunden erfasst"
              description="Dokumentieren Sie die ersten Unterrichtseinheiten für Dozenten und Kursteilnehmer."
            >
              <Link href="/lessons">
                <Button size="sm" className="space-x-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Erste Stunde erfassen</span>
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
                      <TableHead>Datum</TableHead>
                      <TableHead>Lehrkraft</TableHead>
                      <TableHead>Schüler / Gruppe</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Notizen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLessons.map((lesson) => {
                      const t = teacherMap.get(lesson.teacher_id);
                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDate(lesson.lesson_date)}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                            {t?.name || "Unbekannt"}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 text-xs">
                            {lesson.student_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{lesson.duration_hours} Std.</Badge>
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
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 font-medium">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{formatDate(lesson.lesson_date)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {lesson.duration_hours} Std.
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">
                          {lesson.student_name || "Unterrichtseinheit"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Dozent: <strong className="text-slate-700 dark:text-slate-300">{t?.name || "Unbekannt"}</strong>
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

      {/* Upcoming Birthdays Notification Block (next 14 days) - Placed at the very bottom */}
      <UpcomingBirthdays teachers={teachers || []} />
    </div>
  );
}
