"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Phone, 
  Mail, 
  FileText, 
  ArrowRight, 
  Layers,
  DoorOpen,
  AlertTriangle,
  GraduationCap,
  RefreshCw
} from "lucide-react";
import { formatTimeRange } from "@/lib/utils";
import { Teacher } from "@/types/database";
import { LessonOverride, ResolvedOccurrence, resolveOccurrencesForDate } from "@/lib/schedule";
import { OccurrenceEditor } from "@/components/dashboard/occurrence-editor";

export interface CourseWithFullDetails {
  id: string;
  name: string;
  teacher_id: string | null;
  room_id?: string | null;
  course_type?: "group" | "individual" | string | null;
  description: string | null;
  teachers?: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  rooms?: {
    id?: string;
    name: string;
  } | null;
  course_schedules: Array<{
    id?: string;
    day_of_week: string;
    start_time: string;
    duration: number;
  }>;
  student_courses?: Array<{
    students: {
      id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      parent_name?: string | null;
      parent_phone?: string | null;
    };
  }>;
}

export interface AbsenceItem {
  lessonDate: string; // "YYYY-MM-DD"
  courseId: string;
  studentId: string;
  studentName: string;
  studentPhone?: string | null;
  studentEmail?: string | null;
  status: string;
}

interface SchoolWeeklyScheduleProps {
  courses: CourseWithFullDetails[];
  teachers?: Teacher[];
  absences?: AbsenceItem[];
  overrides?: LessonOverride[];
}

const GERMAN_DAYS = [
  { value: "Montag", key: "monday" },
  { value: "Dienstag", key: "tuesday" },
  { value: "Mittwoch", key: "wednesday" },
  { value: "Donnerstag", key: "thursday" },
  { value: "Freitag", key: "friday" },
  { value: "Samstag", key: "saturday" },
  { value: "Sonntag", key: "sunday" },
] as const;

interface SelectedModalState {
  course: CourseWithFullDetails;
  schedule: {
    id?: string;
    day_of_week: string;
    start_time: string;
    duration: number;
  };
  dateStr: string;
  displayDate: string;
  absences: AbsenceItem[];
  isPast: boolean;
  occurrence: ResolvedOccurrence<CourseWithFullDetails>;
}

export function SchoolWeeklySchedule({
  courses,
  teachers = [],
  absences = [],
  overrides = [],
}: SchoolWeeklyScheduleProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedInstance, setSelectedInstance] = useState<SelectedModalState | null>(null);
  const [filterType, setFilterType] = useState<"all" | "group" | "individual">("all");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");

  const tDashboard = useTranslations("dashboard");
  const tSchedule = useTranslations("schedule");
  const tPortal = useTranslations("portal");
  const tLessons = useTranslations("lessons");
  const tCommon = useTranslations("common");
  const tOv = useTranslations("overrides");
  const locale = useLocale();

  // Periodic refresh: refetch server data when the admin returns to this window (max. every 30s)
  useEffect(() => {
    let last = Date.now();
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < 30000) return;
      last = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [router]);

  const jsLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";

  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset + currentWeekOffset * 7);

    return GERMAN_DAYS.map((dayItem, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const isToday = d.toDateString() === today.toDateString();
      return {
        dbName: dayItem.value,
        name: tSchedule(dayItem.key),
        date: d,
        dateStr,
        displayDate: d.toLocaleDateString(jsLocale, { day: "2-digit", month: "2-digit" }),
        isToday,
      };
    });
  }, [currentWeekOffset, jsLocale, tSchedule]);

  const weekRangeLabel = `${weekDays[0].displayDate} – ${weekDays[6].displayDate}.${weekDays[6].date.getFullYear()}`;

  // Unique teachers list for filter dropdown
  const teacherOptions = useMemo(() => {
    if (teachers && teachers.length > 0) return teachers;
    const map = new Map<string, Teacher>();
    courses.forEach((c) => {
      if (c.teachers?.id && c.teachers?.name) {
        map.set(c.teachers.id, {
          id: c.teachers.id,
          name: c.teachers.name,
        } as Teacher);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [teachers, courses]);

  // Map absences by key: `${courseId}_${lessonDate}`
  const absencesMap = useMemo(() => {
    const map = new Map<string, AbsenceItem[]>();
    absences.forEach((a) => {
      const key = `${a.courseId}_${a.lessonDate}`;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    });
    return map;
  }, [absences]);

  // Filter courses by selected type AND teacher
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (filterType === "group" && (c.course_type || "group") !== "group") return false;
      if (filterType === "individual" && c.course_type !== "individual") return false;
      return true;
    });
  }, [courses, filterType]);

  const teacherNameById = useMemo(
    () => new Map(teacherOptions.map((tc) => [tc.id, tc.name])),
    [teacherOptions]
  );

  const modalTeacher: { name: string; email?: string | null; phone?: string | null } | null = selectedInstance
    ? selectedInstance.occurrence.isSubstituted
      ? teacherOptions.find((tc) => tc.id === selectedInstance.occurrence.teacherId) ?? null
      : selectedInstance.course.teachers ?? null
    : null;

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
      {/* Header with Navigation and Filters */}
      <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {tDashboard("weekPlanTitle")}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:border-slate-700">
                  {weekRangeLabel}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tDashboard("weekPlanDesc")}
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Teacher Filter Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs">
              <GraduationCap strokeWidth={1.5} className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="bg-transparent font-medium text-slate-800 dark:text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
                aria-label="Filter"
              >
                <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {tDashboard("filterAllTeachers", { count: teacherOptions.length })}
                </option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Type Filter Buttons */}
            <div className="flex items-center space-x-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tCommon("all")}
              </button>
              <button
                type="button"
                onClick={() => setFilterType("group")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "group"
                    ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-bold shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tDashboard("filterGroups")}
              </button>
              <button
                type="button"
                onClick={() => setFilterType("individual")}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  filterType === "individual"
                    ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {tDashboard("filterIndividual")}
              </button>
            </div>

            {/* 3. Refresh + Week Navigation Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startRefresh(() => router.refresh())}
                disabled={isRefreshing}
                className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 dark:border-slate-700"
                title={tCommon("refresh")}
                aria-label={tCommon("refresh")}
              >
                <RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 dark:border-slate-700"
                title={tPortal("previousWeek")}
              >
                <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentWeekOffset(0)}
                className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-300 px-2.5"
              >
                {currentWeekOffset === 0 ? tPortal("thisWeek") : tPortal("today")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 dark:border-slate-700"
                title={tPortal("nextWeek")}
              >
                <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Weekly 7-Day Grid */}
      <CardContent className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/60">
        <div className="md:hidden flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1 pb-2">
          <span>&larr; {tPortal("swipeHint")} &rarr;</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">{tPortal("sevenDayWeek")}</span>
        </div>

        <div className="flex md:grid md:grid-cols-7 gap-3 overflow-x-auto pb-4 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {weekDays.map((day) => {
            // Template + one-off overrides (moved lessons / substitutes), filtered by EFFECTIVE teacher
            const instances = resolveOccurrencesForDate(filteredCourses, overrides, day.dateStr).filter(
              (o) => selectedTeacherId === "all" || o.teacherId === selectedTeacherId
            );

            return (
              <div
                key={day.dbName}
                className={`w-[84vw] max-w-[320px] sm:w-[280px] md:w-auto shrink-0 md:shrink snap-center md:snap-align-none rounded-xl border p-3 flex flex-col min-h-[230px] transition-all ${
                  day.isToday
                    ? "bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-950 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-bold ${day.isToday ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-800 dark:text-slate-200"}`}>
                      {day.name}
                    </span>
                    {day.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                      day.isToday
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800"
                    }`}
                  >
                    {day.displayDate}
                  </span>
                </div>

                {/* Day Lessons List */}
                <div className="space-y-2 flex-1">
                  {instances.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-3">
                      <span className="text-[11px] text-slate-300 dark:text-slate-600 italic">{tPortal("noLessonOnDay")}</span>
                    </div>
                  ) : (
                    instances.map((occ, idx) => {
                      const { course } = occ;
                      // Effective schedule values (after override)
                      const schedule = {
                        id: occ.schedule.id,
                        day_of_week: occ.schedule.day_of_week,
                        start_time: occ.startTime,
                        duration: occ.duration,
                      };
                      const isIndividual = course.course_type === "individual";
                      const enrolledCount = course.student_courses?.length || 0;
                      const teacherName =
                        (occ.isSubstituted ? teacherNameById.get(occ.teacherId || "") : course.teachers?.name) ||
                        tLessons("unknownTeacher");

                      const [startH, startM] = schedule.start_time.split(":").map((v) => parseInt(v, 10));
                      const scheduledDateTime = new Date(day.date);
                      scheduledDateTime.setHours(isNaN(startH) ? 0 : startH, isNaN(startM) ? 0 : startM, 0, 0);
                      const isPast = scheduledDateTime.getTime() < Date.now();

                      const courseAbsences = absencesMap.get(`${course.id}_${day.dateStr}`) || [];
                      const hasAbsences = isPast && courseAbsences.length > 0;

                      return (
                        <div
                          key={`${course.id}-${occ.originalDate}-${occ.originalStartTime}-${idx}`}
                          onClick={() =>
                            setSelectedInstance({
                              occurrence: occ,
                              course,
                              schedule,
                              dateStr: day.dateStr,
                              displayDate: `${day.name}, ${day.displayDate}`,
                              absences: courseAbsences,
                              isPast,
                            })
                          }
                          className={`group cursor-pointer rounded-xl p-3 border transition-all text-left shadow-sm hover:shadow-md active:scale-[0.99] relative ${
                            hasAbsences
                              ? "bg-gradient-to-br from-white to-amber-50/40 dark:from-slate-800 dark:to-amber-950/30 border-amber-300 dark:border-amber-900/60 hover:border-amber-400 ring-1 ring-amber-200 dark:ring-amber-950"
                              : isIndividual
                              ? "bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-800 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400"
                              : "bg-gradient-to-br from-white to-blue-50/40 dark:from-slate-800 dark:to-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500"
                          }`}
                        >
                          {/* Time & Duration Header */}
                          <div className="flex items-baseline justify-between gap-1 mb-1.5">
                            <div className="flex items-center space-x-2 font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                              <Clock strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>{formatTimeRange(schedule.start_time, schedule.duration)}</span>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {schedule.duration} {tCommon("hourShort")}
                              </span>

                              {hasAbsences && (
                                <span className="relative flex h-2 w-2 shrink-0 ml-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Course Name */}
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-tight">
                            {course.name}
                          </p>

                          {(occ.isMoved || occ.isSubstituted) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {occ.isMoved && (
                                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold px-1.5 py-0 text-[9px]">
                                  {tOv("badgeMoved")}
                                </Badge>
                              )}
                              {occ.isSubstituted && (
                                <Badge variant="outline" className="bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 font-bold px-1.5 py-0 text-[9px]">
                                  {tOv("badgeSubstitute")}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Teacher Name & Room */}
                          <div className="space-y-0.5 mt-1.5">
                            <div className={`flex items-center space-x-1 text-[11px] ${occ.isSubstituted ? "text-violet-700 dark:text-violet-300 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                              <User strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="truncate">{teacherName}</span>
                            </div>

                            {course.rooms?.name ? (
                              <div className="flex items-center space-x-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="truncate">{course.rooms.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1 text-[10px] text-slate-400 dark:text-slate-500">
                                <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                <span className="italic">{tPortal("notAssigned")}</span>
                              </div>
                            )}
                          </div>

                          {/* Footer with Type & Enrolled Count */}
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/80 dark:border-slate-700/60 text-[10px]">
                            {isIndividual ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold px-1.5 py-0 text-[9px]"
                              >
                                {tPortal("individualShort")}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold px-1.5 py-0 text-[9px]"
                              >
                                {tPortal("groupShort")}
                              </Badge>
                            )}

                            <span className="text-slate-400 dark:text-slate-500 flex items-center space-x-0.5">
                              <Users strokeWidth={1.5} className="w-3.5 h-3.5 mr-0.5" />
                              <span>{enrolledCount} {tCommon("students")}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Course Details Modal Dialog */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-xl sm:max-w-xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-start space-x-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                    selectedInstance.course.course_type === "individual"
                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <Layers strokeWidth={1.5} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tDashboard("courseDetails")}
                    </span>
                    {selectedInstance.course.course_type === "individual" ? (
                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] py-0 font-bold">
                        {tPortal("individualRateBadge")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-[10px] py-0 font-bold">
                        {tPortal("groupRateBadge")}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                    {selectedInstance.course.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <Clock strokeWidth={1.5} className="w-4 h-4 text-blue-500" />
                    <span>{selectedInstance.displayDate} • {formatTimeRange(selectedInstance.schedule.start_time, selectedInstance.schedule.duration)} ({selectedInstance.schedule.duration} {tCommon("hours")})</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedInstance(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg active:scale-95 transition-all shrink-0"
                aria-label={tCommon("close")}
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[72vh]">
              {/* Absences Alert Box */}
              {selectedInstance.absences.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white dark:from-amber-950/60 dark:via-amber-950/40 dark:to-slate-900 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-300">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <AlertTriangle strokeWidth={1.5} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">
                          {tDashboard("recordedAbsencesForLesson")}
                        </span>
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 block">
                          {selectedInstance.absences.length} {tCommon("students")}
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 shadow-sm">
                      ⚠️ {selectedInstance.absences.length} {tPortal("absentCheckbox")}
                    </Badge>
                  </div>

                  <div className="space-y-2 pt-1">
                    {selectedInstance.absences.map((abs) => (
                      <div
                        key={abs.studentId}
                        className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900/40 shadow-sm text-xs"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {abs.studentName.charAt(0)}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                            {abs.studentName}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {abs.studentPhone && (
                            <a
                              href={`tel:${abs.studentPhone}`}
                              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                              title={`Tel: ${abs.studentPhone}`}
                            >
                              <Phone strokeWidth={1.5} className="w-4 h-4" />
                            </a>
                          )}
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold text-[10px]">
                            {tDashboard("unexcusedAbsent")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin: change THIS lesson only (override) */}
              <OccurrenceEditor
                key={`${selectedInstance.course.id}-${selectedInstance.occurrence.originalDate}-${selectedInstance.occurrence.originalStartTime}`}
                courseId={selectedInstance.course.id}
                courseTeacherId={selectedInstance.course.teacher_id}
                courseTeacherName={selectedInstance.course.teachers?.name || tLessons("unknownTeacher")}
                originalDate={selectedInstance.occurrence.originalDate}
                originalStartTime={selectedInstance.occurrence.originalStartTime}
                originalDuration={Number(selectedInstance.occurrence.schedule.duration) || 1.5}
                currentDate={selectedInstance.dateStr}
                currentStartTime={selectedInstance.occurrence.startTime}
                currentDuration={selectedInstance.occurrence.duration}
                currentTeacherId={selectedInstance.occurrence.teacherId}
                hasOverride={Boolean(selectedInstance.occurrence.override)}
                isPast={selectedInstance.isPast}
                teachers={teacherOptions}
                onDone={() => setSelectedInstance(null)}
              />

              {/* Room Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{tDashboard("classroomLocation")}</span>
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedInstance.course.rooms?.name || tPortal("notAssigned")}
                </p>
              </div>

              {/* Teacher Info Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <User strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{tCommon("teacher")}</span>
                </span>

                {modalTeacher ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {modalTeacher.name}
                      </p>
                      {selectedInstance.occurrence.isSubstituted && (
                        <p className="text-[11px] text-violet-600 dark:text-violet-300">
                          {tOv("substituteFor", { name: selectedInstance.course.teachers?.name || tLessons("unknownTeacher") })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {modalTeacher.phone && (
                        <a
                          href={`tel:${modalTeacher.phone}`}
                          className="h-8 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center space-x-1 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                        >
                          <Phone strokeWidth={1.5} className="w-4 h-4" />
                          <span>{modalTeacher.phone}</span>
                        </a>
                      )}
                      {modalTeacher.email && (
                        <a
                          href={`mailto:${modalTeacher.email}`}
                          className="h-8 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center space-x-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Mail strokeWidth={1.5} className="w-4 h-4" />
                          <span>E-Mail</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">{tLessons("unknownTeacher")}</p>
                )}
              </div>

              {/* Schedule Days Box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{tDashboard("regularSchedule")}</span>
                </span>

                {selectedInstance.course.course_schedules.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">{tPortal("noLessonOnDay")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedInstance.course.course_schedules.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-900 dark:text-slate-100">{s.day_of_week}</span>
                        <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-mono font-medium">
                          <Clock strokeWidth={1.5} className="w-4 h-4 text-blue-500" />
                          <span>{formatTimeRange(s.start_time, s.duration)} ({s.duration} {tCommon("hours")})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Course Description */}
              {selectedInstance.course.description && (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <FileText strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{tDashboard("courseDescContent")}</span>
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedInstance.course.description}
                  </p>
                </div>
              )}

              {/* Students Enrolled List */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-2">
                    <Users strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>{tDashboard("participantsList", { count: selectedInstance.course.student_courses?.length || 0 })}</span>
                  </span>

                  <Link href="/courses">
                    <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center">
                      {tDashboard("manageCourse")}
                      <ArrowRight strokeWidth={1.5} className="w-4 h-4 ml-1" />
                    </span>
                  </Link>
                </div>

                {!selectedInstance.course.student_courses || selectedInstance.course.student_courses.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">{tDashboard("noStudentsEnrolled")}</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedInstance.course.student_courses.map((sc, i) => {
                      const student = sc.students;
                      if (!student) return null;
                      return (
                        <div
                          key={student.id || i}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {student.first_name} {student.last_name}
                              </p>
                              {student.parent_name && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                  {tDashboard("parents")}: {student.parent_name}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            {student.phone && (
                              <a
                                href={`tel:${student.phone}`}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title={`Tel: ${student.phone}`}
                              >
                                <Phone strokeWidth={1.5} className="w-4 h-4" />
                              </a>
                            )}
                            {student.parent_phone && (
                              <a
                                href={`tel:${student.parent_phone}`}
                                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                title={`Tel: ${student.parent_phone}`}
                              >
                                <Phone strokeWidth={1.5} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/60 shrink-0">
              <Link href="/courses">
                <Button variant="outline" size="sm" className="text-xs">
                  {tDashboard("goToCoursesAndSchedule")}
                </Button>
              </Link>
              <Button size="sm" onClick={() => setSelectedInstance(null)} className="text-xs">
                {tCommon("close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
