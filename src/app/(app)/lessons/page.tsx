import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateLessonPayroll } from "@/lib/payroll";
import { AddLessonDialog } from "@/components/lessons/add-lesson-dialog";
import { DeleteLessonButton } from "@/components/lessons/delete-lesson-button";
import { LessonDetailsDialog, LessonAttendanceRecord } from "@/components/lessons/lesson-details-dialog";
import { SubstituteTeacherDialog } from "@/components/lessons/substitute-teacher-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { BookOpen, Calendar, Clock, Euro } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { ListFilters } from "@/components/ui/list-filters";
import { MissedLessonsPanel } from "@/components/lessons/missed-lessons-panel";
import { loadUnrecordedLessons } from "@/lib/missed-lessons-data";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("common");
  return { title: `${t("lessons")} • Sprachschul-Manager` };
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; teacher?: string; status?: string }>;
}) {
  const [teacher, membership, organization, tLessons, tCommon, locale] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("lessons"),
    getTranslations("common"),
    getLocale(),
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
      .select("*, teachers!lessons_teacher_id_fkey(*), courses(*), attendance(*, students(*))")
      .eq("organization_id", organization.id)
      .order("lesson_date", { ascending: false }),
  ]);

  const teachers = teachersResult.data || [];
  const students = studentsResult.data || [];
  const lessons = lessonsResult.data || [];

  // Map teachers & students by id
  const teacherMap = new Map((teachers || []).map((t) => [t.id, t]));
  const studentMap = new Map((students || []).map((s) => [s.id, s]));

  // Past scheduled lessons that were never recorded (admin confirms them in bulk)
  const unrecorded = await loadUnrecordedLessons(supabase, organization.id);

  // Search & filters (URL parameters q, teacher, status)
  const sp = await searchParams;
  const q = (sp.q || "").trim().toLowerCase();
  const teacherFilter = sp.teacher || "";
  const statusFilter = sp.status || "";
  const filteredLessons = lessons.filter((l) => {
    if (teacherFilter && l.teacher_id !== teacherFilter && l.original_teacher_id !== teacherFilter) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    if (q) {
      const extra = l as unknown as { courses?: { name?: string } | null; notes?: string | null };
      const hay = [
        teacherMap.get(l.teacher_id)?.name,
        l.original_teacher_id ? teacherMap.get(l.original_teacher_id)?.name : "",
        l.student_id
          ? `${studentMap.get(l.student_id)?.first_name || ""} ${studentMap.get(l.student_id)?.last_name || ""}`
          : "",
        extra.courses?.name,
        extra.notes,
        l.lesson_date,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Calculate totals
  const totalHours = (lessons || []).reduce(
    (sum, l) => sum + (l.status === "cancelled_by_student" ? 0 : Number(l.duration_hours || 0)),
    0
  );

  const totalHonorare = (lessons || []).reduce((sum, l) => {
    const teacher = teacherMap.get(l.teacher_id);
    const calc = calculateLessonPayroll(
      Number(l.duration_hours || 0),
      (l as unknown as { courses?: { course_type?: string } }).courses?.course_type,
      teacher,
      l.status,
      organization.late_cancellation_pay_percent ?? 50
    );
    return sum + calc.totalAmount;
  }, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tLessons("title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tLessons("subtitle")}
          </p>
        </div>

        <AddLessonDialog teachers={teachers || []} students={students || []} />
      </div>

      {unrecorded.length > 0 && (
        <MissedLessonsPanel
          key={unrecorded.map((u) => u.key).join(",")}
          items={unrecorded.map((u) => ({
            key: u.key,
            courseName: u.courseName,
            date: u.date,
            startTime: u.startTime,
            duration: u.duration,
            teacherName: teacherMap.get(u.teacherId)?.name || "",
            isSubstituted: u.isSubstituted,
            isMoved: u.isMoved,
          }))}
        />
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BookOpen strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tLessons("totalUnits")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{lessons?.length || 0}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tLessons("taughtHours")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalHours.toFixed(1)} {tCommon("hours")}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Euro strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tLessons("totalPayrollDue")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalHonorare)}</p>
          </div>
        </div>
      </div>

      {lessons.length > 0 && (
        <ListFilters
          searchPlaceholder={tLessons("listSearchPlaceholder")}
          shown={filteredLessons.length}
          total={lessons.length}
          filters={[
            {
              param: "teacher",
              label: tLessons("filterTeacher"),
              allLabel: tLessons("allTeachers"),
              options: teachers.map((t) => ({ value: t.id, label: t.name })),
            },
            {
              param: "status",
              label: tLessons("statusLabel"),
              allLabel: tLessons("allStatuses"),
              options: [
                { value: "completed", label: tLessons("statusCompleted") },
                { value: "cancelled_by_student", label: tLessons("statusCancelledByStudent") },
                { value: "cancelled_late", label: tLessons("statusCancelledLate") },
              ],
            },
          ]}
        />
      )}

      {/* Lessons Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{tLessons("allRecordedLessons")}</CardTitle>
          <CardDescription>
            {tLessons("allRecordedLessonsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!lessons || lessons.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={tLessons("emptyTitle")}
              description={tLessons("emptyDesc")}
            >
              <AddLessonDialog teachers={teachers || []} students={students || []} />
            </EmptyState>
          ) : filteredLessons.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              {tCommon("noResults")}
            </div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tLessons("date")}</TableHead>
                      <TableHead>{tLessons("teacher")}</TableHead>
                      <TableHead>{tLessons("studentCourse")}</TableHead>
                      <TableHead>{tLessons("statusLabel")}</TableHead>
                      <TableHead>{tLessons("duration")}</TableHead>
                      <TableHead>{tLessons("ratePerHour")}</TableHead>
                      <TableHead className="text-right">{tLessons("honorar")}</TableHead>
                      <TableHead>{tLessons("notes")}</TableHead>
                      <TableHead className="text-right">{tLessons("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLessons.map((lesson) => {
                      const teacher = teacherMap.get(lesson.teacher_id);
                      const originalTeacher = lesson.original_teacher_id
                        ? teacherMap.get(lesson.original_teacher_id)
                        : null;
                      const isSubstitution = Boolean(
                        lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id
                      );

                      const rate = Number(teacher?.hourly_rate || 0);
                      const calc = calculateLessonPayroll(
                        Number(lesson.duration_hours || 0),
                        (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                        teacher,
                        lesson.status,
                        organization.late_cancellation_pay_percent ?? 50
                      );
                      const honorar = calc.totalAmount;
                      const lessonAttendance = ((lesson as unknown as { attendance?: LessonAttendanceRecord[] }).attendance || []);

                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDate(lesson.lesson_date, locale)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-2 flex-wrap gap-1">
                                <span>{teacher?.name || tLessons("unknownTeacher")}</span>
                                {isSubstitution && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold"
                                  >
                                    {tLessons("substitution")}
                                  </Badge>
                                )}
                              </div>
                              {isSubstitution && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {tLessons("substitutionFor", { name: originalTeacher?.name || tLessons("formerTeacher") })}
                                </span>
                              )}
                            </div>
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
                            <Badge variant="secondary">{lesson.duration_hours} {tCommon("hours")}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 dark:text-slate-400 font-mono text-xs">
                            <div>
                              <span>{formatCurrency(calc.rateUsed)}</span>
                              {calc.rateDescription && (
                                <span className="block text-[10px] text-slate-400">{calc.rateDescription}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(honorar)}
                          </TableCell>
                          <TableCell className="text-xs text-slate-400 dark:text-slate-400 max-w-xs truncate">
                            {lesson.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <SubstituteTeacherDialog
                                lessonId={lesson.id}
                                currentTeacherId={lesson.teacher_id}
                                currentTeacherName={teacher?.name || tLessons("unknownTeacher")}
                                originalTeacherId={lesson.original_teacher_id}
                                originalTeacherName={originalTeacher?.name}
                                lessonDate={lesson.lesson_date}
                                durationHours={Number(lesson.duration_hours)}
                                studentOrCourseName={lesson.student_name || tLessons("defaultLessonTitle")}
                                teachers={teachers}
                              />
                              <LessonDetailsDialog
                                lessonId={lesson.id}
                                lessonDate={lesson.lesson_date}
                                durationHours={Number(lesson.duration_hours)}
                                teacherName={teacher?.name || tLessons("unknownTeacher")}
                                teacherHourlyRate={rate}
                                courseOrStudentName={lesson.student_name || tLessons("defaultLessonTitle")}
                                notes={lesson.notes}
                                attendance={lessonAttendance}
                                status={lesson.status}
                                calculatedHonorar={honorar}
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
                {filteredLessons.map((lesson) => {
                  const teacher = teacherMap.get(lesson.teacher_id);
                  const originalTeacher = lesson.original_teacher_id
                    ? teacherMap.get(lesson.original_teacher_id)
                    : null;
                  const isSubstitution = Boolean(
                    lesson.original_teacher_id && lesson.original_teacher_id !== lesson.teacher_id
                  );

                  const rate = Number(teacher?.hourly_rate || 0);
                  const calc = calculateLessonPayroll(
                    Number(lesson.duration_hours || 0),
                    (lesson as unknown as { courses?: { course_type?: string } }).courses?.course_type,
                    teacher,
                    lesson.status,
                    organization.late_cancellation_pay_percent ?? 50
                  );
                  const honorar = calc.totalAmount;
                  const lessonAttendance = ((lesson as unknown as { attendance?: LessonAttendanceRecord[] }).attendance || []);

                  return (
                    <div 
                      key={lesson.id} 
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>{formatDate(lesson.lesson_date, locale)}</span>
                          </div>
                          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base mt-0.5 leading-tight">
                            {lesson.student_name || tLessons("defaultLessonTitle")}
                          </h3>
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                            <span>{tCommon("teacher")}: <strong>{teacher?.name || tLessons("unknownTeacher")}</strong></span>
                            {isSubstitution && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold"
                              >
                                {tLessons("substitution")}
                              </Badge>
                            )}
                            {lesson.status === "cancelled_by_student" ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                                {tLessons("statusCancelledByStudent")}
                              </Badge>
                            ) : lesson.status === "cancelled_late" ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold">
                                {tLessons("statusCancelledLate")}
                              </Badge>
                            ) : null}
                          </div>
                          {isSubstitution && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {tLessons("substitutionFor", { name: originalTeacher?.name || tLessons("formerTeacher") })}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                            {formatCurrency(honorar)}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {lesson.duration_hours} {tCommon("hours")} ({calc.rateDescription})
                          </span>
                        </div>
                      </div>

                      {/* Attendance indicator if present */}
                      {lessonAttendance.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {tLessons("ofStudentsPresent", {
                              present: lessonAttendance.filter(a => a.status === "present").length,
                              total: lessonAttendance.length
                            })}
                          </span>
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            {tLessons("documented")}
                          </span>
                        </div>
                      )}

                      {/* Mobile Actions */}
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <SubstituteTeacherDialog
                          lessonId={lesson.id}
                          currentTeacherId={lesson.teacher_id}
                          currentTeacherName={teacher?.name || tLessons("unknownTeacher")}
                          originalTeacherId={lesson.original_teacher_id}
                          originalTeacherName={originalTeacher?.name}
                          lessonDate={lesson.lesson_date}
                          durationHours={Number(lesson.duration_hours)}
                          studentOrCourseName={lesson.student_name || tLessons("defaultLessonTitle")}
                          teachers={teachers}
                        />
                        <LessonDetailsDialog
                          lessonId={lesson.id}
                          lessonDate={lesson.lesson_date}
                          durationHours={Number(lesson.duration_hours)}
                          teacherName={teacher?.name || tLessons("unknownTeacher")}
                          teacherHourlyRate={rate}
                          courseOrStudentName={lesson.student_name || tLessons("defaultLessonTitle")}
                          notes={lesson.notes}
                          attendance={lessonAttendance}
                          status={lesson.status}
                          calculatedHonorar={honorar}
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
