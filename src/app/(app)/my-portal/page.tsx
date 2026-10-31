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

interface MyPortalPageProps {
  searchParams: Promise<{ month?: string }>;
}

export const metadata = {
  title: "Mein Dozenten-Portal • Sprachschul-Manager",
};

export default async function MyPortalPage({ searchParams }: MyPortalPageProps) {
  const { month: selectedMonthParam } = await searchParams;

  const [organization, teacher] = await Promise.all([
    getActiveOrganization(),
    getCurrentTeacher(),
  ]);

  if (!organization || !teacher) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <Card className="p-8">
          <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Kein Dozenten-Profil gefunden</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Ihr Benutzerkonto ist aktuell noch keiner Lehrkraft in dieser Schule zugeordnet.
            Bitte wenden Sie sich an die Schulleitung ({organization?.name || "Sprachschule"}), 
            damit diese Ihre E-Mail-Adresse im System hinterlegt.
          </p>
          <Link href="/dashboard" className="text-sm text-blue-600 font-medium hover:underline">
            Zurück zur Übersicht
          </Link>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();

  // Active month calculation
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const activeMonth = selectedMonthParam || defaultMonth;

  const selectedDate = new Date(`${activeMonth}-01`);
  const monthNameYear = selectedDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const todayFormatted = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Month selector choices (past 6 months)
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return { value, label };
  });

  type RawTeacherCourse = Course & {
    rooms?: { id?: string; name: string } | null;
    student_courses?: Array<{ students?: Student }>;
    course_schedules?: import("@/types/database").CourseSchedule[];
  };

  // Parallel fetch: teacher courses and teacher lessons
  const [coursesResult, lessonsResult] = await Promise.all([
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
  ]);

  const rawTeacherCourses = (coursesResult.data as unknown as RawTeacherCourse[]) || [];
  const allLessons = lessonsResult.data || [];

  const teacherCourses = (rawTeacherCourses || []).map((c) => {
    const enrolledStudents = (c.student_courses || [])
      .map((sc: { students?: Student }) => sc.students)
      .filter(Boolean) as Student[];
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
      teacher
    );
    return sum + calc.totalAmount;
  }, 0);
  const hourlyRate = Number(teacher.hourly_rate);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* 1. Official Print Document Header (Visible ONLY when printing / downloading PDF) */}
      <div className="hidden print:block mb-8 pb-4 border-b-2 border-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-widest text-slate-500">
              Tätigkeitsnachweis &amp; Honorarabrechnung
            </span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{organization.name}</h1>
            <p className="text-xs text-slate-500">Sprachschule &amp; Weiterbildung</p>
          </div>
          <div className="text-right text-xs text-slate-700 space-y-1">
            <div>Abrechnungsmonat: <strong className="text-slate-900 text-sm">{monthNameYear}</strong></div>
            <div>Druckdatum: <strong className="text-slate-900">{todayFormatted}</strong></div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Lehrkraft / Dozent:</span>
            <span className="text-base font-bold text-slate-900">{teacher.name}</span>
            {teacher.email && <span className="text-slate-500 block">{teacher.email}</span>}
          </div>
          <div className="text-right">
            <span className="text-slate-400 block font-medium">Vertraglicher Stundensatz:</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(hourlyRate)} / Std.</span>
          </div>
        </div>
      </div>

      {/* 2. Welcome & Teacher Header (Hidden on print) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Willkommen, {teacher.name}!
              </h1>
              <Badge variant="success" className="text-xs">
                Lehrkraft
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Schule: <strong>{organization.name}</strong> • Dozenten-Portal &amp; Abrechnung
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/absences">
            <Badge variant="outline" className="cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-1.5 px-3 border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
              <UserX className="w-3.5 h-3.5 text-rose-500" />
              <span>Fehlzeiten-Bericht</span>
            </Badge>
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* 3. Interactive Weekly Calendar (Swipeable on mobile, dynamic SSR-free import) */}
      <DynamicWeeklyCalendar courses={teacherCourses as CourseWithStudents[]} />

      {/* 4. Monthly Payroll Summary Card */}
      <Card className="border-blue-200 dark:border-slate-800 bg-gradient-to-br from-white to-blue-50/20 dark:from-slate-900 dark:to-slate-850/60 print:hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1.5 mb-1">
              <Euro className="w-3.5 h-3.5" />
              <span>Monatsabrechnung</span>
            </span>
            <CardTitle className="text-xl">
              Honorare für {monthNameYear}
            </CardTitle>
            <CardDescription>
              Übersicht Ihrer gehaltenen Stunden und errechneten Bezüge
            </CardDescription>
          </div>

          {/* Month selector dropdown buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
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
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Unterrichtsstunden</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {totalHours.toFixed(1)} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">Std.</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{monthlyLessons.length} Einheiten im {monthNameYear}</p>
            </div>

            <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center space-x-1.5">
                <Euro className="w-3.5 h-3.5 text-slate-400" />
                <span>Basis-Stundensatz</span>
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                {formatCurrency(hourlyRate)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {(teacher.rate_group || teacher.rate_individual) ? "Differenzierte Sätze aktiv" : "Pauschal pro 60 Min."}
              </p>
            </div>

            <div className="bg-blue-600 text-white p-4 rounded-xl shadow-md">
              <span className="text-xs text-blue-100 font-medium flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" />
                <span>Auszahlungsbetrag</span>
              </span>
              <div className="text-3xl font-extrabold mt-2">
                {formatCurrency(totalEarnings)}
              </div>
              <p className="text-[11px] text-blue-100 mt-1">
                Gerechnet für {monthlyLessons.length} gehaltene Einheiten
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
              Unterrichtsnachweis ({monthlyLessons.length} Einheiten)
            </CardTitle>
            <CardDescription>
              Detailaufstellung Ihrer Stunden im Monat {monthNameYear}
            </CardDescription>
          </div>
          <PrintButton />
        </CardHeader>
        <CardContent className="print:p-0">
          {monthlyLessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={`Keine Stunden im ${monthNameYear}`}
              description="Sie haben in diesem Monat noch keine gehaltenen Unterrichtseinheiten dokumentiert. Nutzen Sie den Wochenplan oben, um Ihren Unterricht zu starten."
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow className="print:border-slate-300">
                      <TableHead>Datum</TableHead>
                      <TableHead>Kurs / Schüler</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Satz / Berechnung</TableHead>
                      <TableHead className="text-right">Vergütung</TableHead>
                      <TableHead>Notizen / Thema</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyLessons.map((lesson) => {
                      const calc = calculateLessonPayroll(
                        Number(lesson.duration_hours || 0),
                        (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                        teacher
                      );

                      return (
                        <TableRow key={lesson.id} className="print:border-slate-200">
                          <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                            {formatDate(lesson.lesson_date)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">
                            <div>
                              <span>{lesson.student_name || "—"}</span>
                              {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                                <span className="block text-[10px] text-emerald-600 font-semibold">
                                  Einzelunterricht (1:1)
                                </span>
                              ) : (
                                <span className="block text-[10px] text-slate-400">
                                  Gruppenunterricht
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="print:bg-transparent print:border-none print:p-0 print:font-semibold">
                              {lesson.duration_hours} Std.
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600 font-mono text-xs">
                            <div>
                              <span>{formatCurrency(calc.rateUsed)}</span>
                              <span className="block text-[10px] text-slate-400 font-sans">{calc.rateDescription}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-700 print:text-black">
                            {formatCurrency(calc.totalAmount)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 max-w-xs truncate print:max-w-none print:whitespace-normal">
                            {lesson.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter className="bg-slate-50 print:bg-slate-100 font-semibold text-slate-900 border-t-2 border-slate-300">
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Gesamtsumme ({monthNameYear})
                      </TableCell>
                      <TableCell className="font-bold">
                        {totalHours.toFixed(1)} Std.
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs italic">
                        Individuelle Sätze
                      </TableCell>
                      <TableCell className="text-right font-black text-base text-emerald-700 print:text-black">
                        {formatCurrency(totalEarnings)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {monthlyLessons.length} {monthlyLessons.length === 1 ? "Einheit" : "Einheiten"}
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
                    teacher
                  );

                  return (
                    <div
                      key={lesson.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1.5 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(lesson.lesson_date)}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {lesson.duration_hours} Std.
                        </Badge>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {lesson.student_name || "Unterrichtseinheit"}
                          </h4>
                          {(lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type === "individual" ? (
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Einzelunterricht (1:1)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              Gruppenunterricht
                            </span>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-extrabold text-emerald-700 block">
                            {formatCurrency(calc.totalAmount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatCurrency(calc.rateUsed)} / {calc.rateDescription}
                          </span>
                        </div>
                      </div>

                      {lesson.notes && (
                        <p className="text-xs text-slate-500 italic pt-1.5 border-t border-slate-100 truncate">
                          &quot;{lesson.notes}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Mobile Monthly Total Strip */}
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">Gesamt ({monthNameYear})</span>
                    <span className="text-[11px] text-slate-500">{totalHours.toFixed(1)} Std. • {monthlyLessons.length} Einheiten</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700">
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
          <span className="text-sm font-bold text-slate-900">Gesamtbetrag zur Auszahlung:</span>
          <span className="text-xl font-black text-slate-900">{formatCurrency(totalEarnings)}</span>
        </div>
        <p className="text-slate-500 italic mb-14">
          Hiermit wird die sachliche und rechnerische Richtigkeit der oben aufgeführten Unterrichtseinheiten bestätigt.
        </p>
        <div className="grid grid-cols-2 gap-16 pt-8">
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            Ort, Datum / Unterschrift Lehrkraft ({teacher.name})
          </div>
          <div className="border-t border-slate-500 pt-2 text-center text-slate-700">
            Unterschrift Schulleitung ({organization.name})
          </div>
        </div>
      </div>
    </div>
  );
}
