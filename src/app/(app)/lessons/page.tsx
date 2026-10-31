import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddLessonDialog } from "@/components/lessons/add-lesson-dialog";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import { LessonDetailsDialog, LessonAttendanceRecord } from "@/components/lessons/lesson-details-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { BookOpen, Calendar, Clock, Euro } from "lucide-react";

export const metadata = {
  title: "Unterrichtsstunden • Sprachschul-Manager",
};

export default async function LessonsPage() {
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

  // Parallel fetch: Teachers, Students, and Lessons
  const [teachersResult, studentsResult, lessonsResult] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("students")
      .select("*")
      .eq("organization_id", organization.id)
      .order("first_name", { ascending: true }),
    supabase
      .from("lessons")
      .select("*, teachers(*), attendance(*, students(*))")
      .eq("organization_id", organization.id)
      .order("lesson_date", { ascending: false }),
  ]);

  const teachers = teachersResult.data || [];
  const students = studentsResult.data || [];
  const lessons = lessonsResult.data || [];

  // Map teachers & students by id
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));
  const studentMap = new Map((students || []).map((s) => [s.id, s]));

  // Calculate totals
  const totalHours = (lessons || []).reduce(
    (sum, l) => sum + Number(l.duration_hours || 0),
    0
  );

  const totalHonorare = (lessons || []).reduce((sum, l) => {
    const teacher = teacherMap.get(l.teacher_id);
    const rate = Number(teacher?.hourly_rate || 0);
    return sum + Number(l.duration_hours || 0) * rate;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Unterrichtsstunden (Klassenbuch)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Erfassung aller Unterrichtseinheiten für die Honorarabrechnung und Teilnehmernachweiserbringung.
          </p>
        </div>

        <AddLessonDialog teachers={teachers || []} students={students || []} />
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gesamte Einheiten</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{lessons?.length || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unterrichtete Stunden</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)} Std.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Euro className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Summe fälliger Honorare</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalHonorare)}</p>
          </div>
        </div>
      </div>

      {/* Lessons Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Alle erfassten Stunden</CardTitle>
          <CardDescription>
            Sortiert nach Datum (neueste zuerst). Jede erfasste Stunde fließt direkt in die Dozentenabrechnung ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!lessons || lessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Noch keine Stunden erfasst"
              description="Erfassen Sie die erste Unterrichtsstunde für die automatische Dozenten-Honorarabrechnung und Teilnehmerübersicht."
            >
              <AddLessonDialog teachers={teachers || []} students={students || []} />
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Lehrkraft</TableHead>
                      <TableHead>Schüler / Kurs</TableHead>
                      <TableHead>Dauer</TableHead>
                      <TableHead>Satz / Std.</TableHead>
                      <TableHead className="text-right">Honorar</TableHead>
                      <TableHead>Notizen</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map((lesson) => {
                      const teacher = teacherMap.get(lesson.teacher_id);
                      const rate = Number(teacher?.hourly_rate || 0);
                      const honorar = Number(lesson.duration_hours) * rate;
                      const lessonAttendance = ((lesson as unknown as { attendance?: LessonAttendanceRecord[] }).attendance || []);

                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDate(lesson.lesson_date)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                            {teacher?.name || "Unbekannter Dozent"}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            {lesson.student_id && studentMap.get(lesson.student_id) ? (
                              <div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {studentMap.get(lesson.student_id)!.first_name} {studentMap.get(lesson.student_id)!.last_name}
                                </span>
                                {lesson.student_name && lesson.student_name !== `${studentMap.get(lesson.student_id)!.first_name} ${studentMap.get(lesson.student_id)!.last_name}` && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 block">{lesson.student_name}</span>
                                )}
                              </div>
                            ) : (
                              lesson.student_name || "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{lesson.duration_hours} Std.</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                            {formatCurrency(rate)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(honorar)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 dark:text-slate-400 max-w-xs truncate">
                            {lesson.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <LessonDetailsDialog
                                lessonId={lesson.id}
                                lessonDate={lesson.lesson_date}
                                durationHours={Number(lesson.duration_hours)}
                                teacherName={teacher?.name || "Unbekannter Dozent"}
                                teacherHourlyRate={rate}
                                courseOrStudentName={lesson.student_name || "Unterricht"}
                                notes={lesson.notes}
                                attendance={lessonAttendance}
                              />
                              <DeleteLessonButton lessonId={lesson.id} />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Native Card View (Shown on screens < md) */}
              <div className="md:hidden space-y-3">
                {lessons.map((lesson) => {
                  const teacher = teacherMap.get(lesson.teacher_id);
                  const rate = Number(teacher?.hourly_rate || 0);
                  const honorar = Number(lesson.duration_hours) * rate;
                  const lessonAttendance = ((lesson as unknown as { attendance?: LessonAttendanceRecord[] }).attendance || []);

                  return (
                    <div 
                      key={lesson.id} 
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{formatDate(lesson.lesson_date)}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5 leading-tight">
                            {lesson.student_name || "Unterrichtseinheit"}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            Lehrkraft: <strong>{teacher?.name || "Unbekannt"}</strong>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                            {formatCurrency(honorar)}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {lesson.duration_hours} Std. × {formatCurrency(rate)}
                          </span>
                        </div>
                      </div>

                      {/* Attendance indicator if present */}
                      {lessonAttendance.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {lessonAttendance.filter(a => a.status === "present").length} von {lessonAttendance.length} Schülern anwesend
                          </span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Dokumentiert
                          </span>
                        </div>
                      )}

                      {/* Mobile Actions */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <LessonDetailsDialog
                          lessonId={lesson.id}
                          lessonDate={lesson.lesson_date}
                          durationHours={Number(lesson.duration_hours)}
                          teacherName={teacher?.name || "Unbekannter Dozent"}
                          teacherHourlyRate={rate}
                          courseOrStudentName={lesson.student_name || "Unterricht"}
                          notes={lesson.notes}
                          attendance={lessonAttendance}
                        />
                        <DeleteLessonButton lessonId={lesson.id} />
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
