import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  createClient, 
  getActiveOrganization, 
  getCurrentTeacher, 
  getCurrentMembership 
} from "@/lib/supabase/server";
import { AddCourseDialog } from "@/components/courses/add-course-dialog";
import { EditCourseDialog } from "@/components/courses/edit-course-dialog";
import { DeleteCourseButton } from "@/components/courses/delete-course-button";
import { ManageCourseStudentsDialog } from "@/components/courses/manage-course-students-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOrganizationCard } from "@/components/dashboard/create-organization-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Layers, Users, Calendar, User, Clock, DoorOpen } from "lucide-react";
import { CourseSchedule, Teacher, Room } from "@/types/database";
import { formatTimeRange } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Kurse & Gruppen • Sprachschul-Manager",
};

interface CoursesPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { tab = "all" } = (await searchParams) || {};

  const [teacher, membership, organization, tCourses, tStudents, tCommon, tSchedule] = await Promise.all([
    getCurrentTeacher(),
    getCurrentMembership(),
    getActiveOrganization(),
    getTranslations("courses"),
    getTranslations("students"),
    getTranslations("common"),
    getTranslations("schedule"),
  ]);

  if (teacher && membership?.role === "teacher") {
    redirect("/my-portal");
  }

  if (!organization) {
    return <CreateOrganizationCard />;
  }

  const supabase = await createClient();

  // Parallel fetch: Teachers, Rooms, Courses, and Students
  const [
    teachersResult,
    roomsResult,
    coursesResult,
    studentsResult
  ] = await Promise.all([
    supabase
      .from("teachers")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true }),
    supabase
      .from("rooms")
      .select("*")
      .eq("organization_id", organization.id)
      .order("name", { ascending: true })
      .then((res) => (res.error ? { data: [] } : res)),
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
    supabase
      .from("students")
      .select("id, first_name, last_name, email, phone, parent_name, parent_phone, course_name, student_courses(course_id)")
      .eq("organization_id", organization.id)
      .order("first_name", { ascending: true }),
  ]);

  const teachers = teachersResult.data || [];
  const rooms: Room[] = (roomsResult.data as Room[]) || [];
  const rawCourses = coursesResult.data || [];
  const allStudents = studentsResult.data || [];

  const courses = (rawCourses || []) as unknown as Array<{
    id: string;
    organization_id: string;
    name: string;
    teacher_id: string | null;
    room_id: string | null;
    course_type: "group" | "individual";
    description: string | null;
    max_capacity: number;
    monthly_price: number;
    created_at: string;
    updated_at: string;
    teachers: Teacher | null;
    rooms: Room | null;
    course_schedules: CourseSchedule[];
    student_courses: Array<{
      status?: "active" | "trial" | "waiting";
      student_id?: string;
      students: { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; parent_name: string | null; parent_phone: string | null };
    }>;
  }>;

  const formattedStudents = (allStudents || []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
    email: s.email,
    phone: s.phone,
    parent_name: s.parent_name,
    parent_phone: s.parent_phone,
    course_name: s.course_name,
    enrolledCourseCount: (s.student_courses || []).length,
  }));

  const totalCourses = courses.length;
  const groupCourses = courses.filter((c) => (c.course_type || "group") === "group");
  const individualCourses = courses.filter((c) => c.course_type === "individual");

  const displayedCourses = courses.filter((c) => {
    if (tab === "group") return (c.course_type || "group") === "group";
    if (tab === "individual") return c.course_type === "individual";
    return true;
  });

  function getDayLabel(day: string): string {
    const map: Record<string, string> = {
      Montag: tSchedule("monday"),
      Dienstag: tSchedule("tuesday"),
      Mittwoch: tSchedule("wednesday"),
      Donnerstag: tSchedule("thursday"),
      Freitag: tSchedule("friday"),
      Samstag: tSchedule("saturday"),
      Sonntag: tSchedule("sunday"),
    };
    return map[day] || day;
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {tCourses("title")} • {organization.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {tCourses("subtitle")}
          </p>
        </div>

        <AddCourseDialog
          teachers={(teachers as Teacher[]) || []}
          rooms={rooms}
          students={formattedStudents}
        />
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Layers strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCourses("allTab")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalCourses}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCourses("groupTab")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{groupCourses.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <User strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCourses("individualTab")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{individualCourses.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center space-x-3 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Calendar strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tCommon("teachers")}</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{teachers?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Courses Card with Tabs */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-base font-semibold">
              {tab === "group" ? tCourses("groupTab") : tab === "individual" ? tCourses("individualTab") : tCourses("allTab")} ({displayedCourses.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {tCourses("subtitle")}
            </CardDescription>
          </div>

          {/* Tab Navigation Filter */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 self-start sm:self-auto">
            <Link
              href="/courses"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === "all"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tCommon("all")} ({totalCourses})
            </Link>
            <Link
              href="/courses?tab=group"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === "group"
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tCourses("group")} ({groupCourses.length})
            </Link>
            <Link
              href="/courses?tab=individual"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tab === "individual"
                  ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tCourses("individual")} ({individualCourses.length})
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {displayedCourses.length === 0 ? (
            <EmptyState
              icon={Layers}
              title={tCourses("emptyTitle")}
              description={tCourses("emptyDesc")}
            >
              <AddCourseDialog
                teachers={(teachers as Teacher[]) || []}
                rooms={rooms}
                students={formattedStudents}
              />
            </EmptyState>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("courses")}</TableHead>
                      <TableHead>{tCourses("courseType")}</TableHead>
                      <TableHead>{tCourses("teacher")}</TableHead>
                      <TableHead>{tCourses("schedule")}</TableHead>
                      <TableHead>{tCourses("studentsCount")}</TableHead>
                      <TableHead className="text-right">{tCommon("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedCourses.map((course) => {
                      const teacherData = course.teachers;
                      const studentCoursesList = course.student_courses || [];
                      const enrolledStudents = studentCoursesList
                        .map((sc) => sc.students)
                        .filter(Boolean);
                      const activeStudents = studentCoursesList.filter((sc) => !sc.status || sc.status === "active");
                      const trialStudents = studentCoursesList.filter((sc) => sc.status === "trial");
                      const waitingStudents = studentCoursesList.filter((sc) => sc.status === "waiting");
                      const maxCapacity = course.max_capacity || 10;
                      const activeCount = activeStudents.length;
                      const isFull = activeCount >= maxCapacity;

                      const schedules = course.course_schedules || [];
                      const isIndividual = course.course_type === "individual";

                      return (
                        <TableRow key={course.id}>
                          <TableCell className="font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                            <div className="flex items-start space-x-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                  isIndividual
                                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                    : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                                }`}
                              >
                                {course.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 dark:text-slate-100 block leading-tight">{course.name}</span>
                                {course.rooms && (
                                  <span className="inline-flex items-center text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                    <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-1" />
                                    {course.rooms.name}
                                  </span>
                                )}
                                {course.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5 line-clamp-2">
                                    {course.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isIndividual ? (
                              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold py-0.5">
                                <User strokeWidth={1.5} className="w-4 h-4 mr-1" />
                                {tCourses("individual")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs font-semibold py-0.5">
                                <Users strokeWidth={1.5} className="w-4 h-4 mr-1" />
                                {tCourses("group")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                            {teacherData ? (
                              <div className="flex items-center space-x-2">
                                <User strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                <span>{teacherData.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 italic">{tCourses("noTeacher")}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {schedules.length === 0 ? (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">{tCommon("notSpecified")}</span>
                            ) : (
                              <div className="flex flex-wrap gap-2 max-w-sm">
                                {schedules.map((s) => (
                                  <Badge
                                    key={s.id}
                                    variant="outline"
                                    className="font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-xs py-0.5"
                                  >
                                    <Clock strokeWidth={1.5} className="w-4 h-4 mr-1 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      {getDayLabel(s.day_of_week)}, {formatTimeRange(s.start_time, s.duration)} ({s.duration} {tCommon("hourShort")})
                                    </span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className={`font-semibold text-xs py-0.5 ${
                                  isFull
                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                }`}
                              >
                                <Users strokeWidth={1.5} className="w-4 h-4 mr-1 text-blue-500" />
                                {activeCount} / {maxCapacity} {tCommon("students")}
                              </Badge>

                              {(trialStudents.length > 0 || waitingStudents.length > 0) && (
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {trialStudents.length > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-100/90 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-900">
                                      +{trialStudents.length} {tStudents("statusTrial")}
                                    </span>
                                  )}
                                  {waitingStudents.length > 0 && (
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                                      +{waitingStudents.length} {tStudents("statusWaiting")}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <EditCourseDialog
                                course={course}
                                schedules={schedules}
                                teachers={(teachers as Teacher[]) || []}
                                rooms={rooms}
                                students={formattedStudents}
                                assignedStudentIds={enrolledStudents.map((s) => s.id)}
                              />
                              <ManageCourseStudentsDialog
                                courseId={course.id}
                                courseName={course.name}
                                maxCapacity={maxCapacity}
                                allStudents={formattedStudents}
                                assignedStudentIds={enrolledStudents.map((s) => s.id)}
                              />
                              <DeleteCourseButton courseId={course.id} />
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
                {displayedCourses.map((course) => {
                  const teacherData = course.teachers;
                  const studentCoursesList = course.student_courses || [];
                  const enrolledStudents = studentCoursesList
                    .map((sc) => sc.students)
                    .filter(Boolean);
                  const activeStudents = studentCoursesList.filter((sc) => !sc.status || sc.status === "active");
                  const maxCapacity = course.max_capacity || 10;
                  const activeCount = activeStudents.length;

                  const schedules = course.course_schedules || [];
                  const isIndividual = course.course_type === "individual";

                  return (
                    <div 
                      key={course.id} 
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                              isIndividual
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                                : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {course.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">
                              {course.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {isIndividual ? (
                                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] py-0 font-bold">
                                  {tCourses("individual")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] py-0 font-bold">
                                  {tCourses("group")}
                                </Badge>
                              )}
                              {course.rooms && (
                                <span className="inline-flex items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  <DoorOpen strokeWidth={1.5} className="w-4 h-4 mr-0.5 text-slate-400 dark:text-slate-500" />
                                  {course.rooms.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <Badge variant="outline" className="font-semibold text-xs py-0.5 shrink-0">
                          {activeCount} / {maxCapacity}
                        </Badge>
                      </div>

                      {/* Teacher & Schedule on Mobile */}
                      <div className="text-xs space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                          <User strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{tCourses("teacher")}: <strong>{teacherData?.name || tCourses("noTeacher")}</strong></span>
                        </div>

                        {schedules.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {schedules.map((s) => (
                              <span
                                key={s.id}
                                className="inline-flex items-center text-[10px] font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                              >
                                <Clock strokeWidth={1.5} className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                {getDayLabel(s.day_of_week)}, {formatTimeRange(s.start_time, s.duration)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions on Mobile */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <ManageCourseStudentsDialog
                          courseId={course.id}
                          courseName={course.name}
                          maxCapacity={maxCapacity}
                          allStudents={formattedStudents}
                          assignedStudentIds={enrolledStudents.map((s) => s.id)}
                        />
                        <div className="flex items-center space-x-1">
                          <EditCourseDialog
                            course={course}
                            schedules={schedules}
                            teachers={(teachers as Teacher[]) || []}
                            rooms={rooms}
                            students={formattedStudents}
                            assignedStudentIds={enrolledStudents.map((s) => s.id)}
                          />
                          <DeleteCourseButton courseId={course.id} />
                        </div>
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
