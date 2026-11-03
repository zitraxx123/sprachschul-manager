"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Course, Student, CourseSchedule } from "@/types/database";
import { recordCourseLesson } from "@/actions/attendance";
import { evaluateCancellationStatus } from "@/lib/payroll";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GermanDatePicker } from "@/components/ui/german-date-picker";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  CheckCircle2, 
  X, 
  Check, 
  AlertCircle, 
  Loader2,
  DoorOpen,
  CalendarSync,
  XCircle,
  AlertTriangle,
  Info,
  RefreshCw
} from "lucide-react";
import { formatTimeRange } from "@/lib/utils";
import { LessonOverride, resolveOccurrencesForDate } from "@/lib/schedule";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { GoogleCalendarIcon } from "./google-calendar-icon";
import { CalendarSubscribeModal } from "./calendar-subscribe-modal";

export type EnrolledStudentWithStatus = Student & {
  enrollment_status?: "active" | "trial" | "waiting";
};

export interface CourseWithStudents extends Course {
  students: EnrolledStudentWithStatus[];
  course_schedules: CourseSchedule[];
  rooms?: { id?: string; name: string } | null;
}

interface WeeklyCalendarProps {
  courses: CourseWithStudents[];
  teacherId: string;
  teacherName?: string;
  lateCancellationHours?: number;
  lateCancellationPayPercent?: number;
  /** One-off exceptions (moved lessons / substitutes) that involve this teacher */
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

export function WeeklyCalendar({
  courses,
  teacherId,
  teacherName,
  lateCancellationHours = 24,
  lateCancellationPayPercent = 50,
  overrides = [],
}: WeeklyCalendarProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  // Periodic refresh: refetch the schedule when the teacher returns to this window (max. every 30s)
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

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<{
    course: CourseWithStudents;
    schedule: CourseSchedule;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [durationHours, setDurationHours] = useState<number>(1.5);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [actionType, setActionType] = useState<"completed" | "cancelled">("completed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const tPortal = useTranslations("portal");
  const tLessons = useTranslations("lessons");
  const tSchedule = useTranslations("schedule");
  const tCommon = useTranslations("common");
  const tStudents = useTranslations("students");
  const tOv = useTranslations("overrides");
  const locale = useLocale();

  const jsLocale = locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "de-DE";

  // Text of the Google Calendar event (localized)
  const buildGcalDetails = (course: CourseWithStudents, extraNotes?: string) => {
    const students = course.students || [];
    const names = students.map((s) => `${s.first_name} ${s.last_name}`).join(", ") || tPortal("gcalNone");
    const type = course.course_type === "individual" ? tPortal("gcalTypeIndividual") : tPortal("gcalTypeGroup");
    return [
      `${tPortal("gcalCourse")}: ${course.name}`,
      `${tPortal("gcalType")}: ${type}`,
      `${tPortal("gcalRoom")}: ${course.rooms?.name || tPortal("notAssigned")}`,
      `${tPortal("gcalParticipants")} (${students.length}): ${names}`,
      ...(extraNotes ? [`${tPortal("gcalNotes")}: ${extraNotes}`] : []),
    ].join("\n");
  };

  // Calculate cancellation status (timely vs. late) dynamically
  const cancellationResult = useMemo(() => {
    if (!selectedInstance || !selectedDate) {
      return {
        status: "cancelled_by_student" as const,
        hoursUntilLesson: 0,
        isLate: false,
      };
    }
    const startTime = selectedInstance.schedule.start_time || "00:00";
    return evaluateCancellationStatus(selectedDate, startTime, lateCancellationHours);
  }, [selectedInstance, selectedDate, lateCancellationHours]);

  // Calculate current week dates based on offset
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset + currentWeekOffset * 7);

  const weekDays = GERMAN_DAYS.map((dayItem, idx) => {
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

  const weekRangeLabel = `${weekDays[0].displayDate} – ${weekDays[6].displayDate}.${weekDays[6].date.getFullYear()}`;

  function handleOpenLesson(course: CourseWithStudents, schedule: CourseSchedule, dateStr: string) {
    setSelectedInstance({ course, schedule });
    setSelectedDate(dateStr);
    setDurationHours(Number(schedule.duration || 1.5));
    setNotes("");
    setActionType("completed");
    setSubmitError(null);
    setSubmitSuccess(false);

    // Default active & trial students to present (checked), waitlist to absent
    const students = course.students || [];
    const initialAttendance: Record<string, boolean> = {};
    students.forEach((s) => {
      initialAttendance[s.id] = s.enrollment_status !== "waiting";
    });
    setAttendanceMap(initialAttendance);
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstance) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const students = selectedInstance.course.students || [];

    if (actionType === "cancelled") {
      // Waiting-list students are not expected to attend -> no absence for them
      const absentAttendances = students
        .filter((s) => s.enrollment_status !== "waiting")
        .map((s) => ({
        student_id: s.id,
        status: "absent" as const,
      }));

      const res = await recordCourseLesson(
        selectedInstance.course.id,
        selectedDate,
        absentAttendances,
        notes,
        durationHours,
        cancellationResult.status,
        selectedInstance.schedule.start_time
      );

      setIsSubmitting(false);

      if (res?.error) {
        setSubmitError(res.error);
        toast.error(res.error || tCommon("error"));
      } else {
        toast.success(tLessons(cancellationResult.status === "cancelled_late" ? "statusCancelledLate" : "statusCancelledByStudent"));
        setSubmitSuccess(true);
        setTimeout(() => {
          setSelectedInstance(null);
          setSubmitSuccess(false);
        }, 1200);
      }
      return;
    }

    // Regular lesson completed
    // Waiting-list students are only recorded when the teacher ticked them as present
    const attendances = students
      .filter((s) => s.enrollment_status !== "waiting" || attendanceMap[s.id])
      .map((s) => ({
        student_id: s.id,
        status: (attendanceMap[s.id] ? "present" : "absent") as "present" | "absent",
      }));

    const res = await recordCourseLesson(
      selectedInstance.course.id,
      selectedDate,
      attendances,
      notes,
      durationHours,
      "completed",
      selectedInstance.schedule.start_time
    );

    setIsSubmitting(false);

    if (res?.error) {
      setSubmitError(res.error);
      toast.error(res.error || tCommon("error"));
    } else {
      toast.success(tPortal("lessonBookedSuccess"));
      setSubmitSuccess(true);
      setTimeout(() => {
        setSelectedInstance(null);
        setSubmitSuccess(false);
      }, 1200);
    }
  }

  return (
    <div className="space-y-4 print:hidden">
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{tPortal("calendarTitle")}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tPortal("calendarDesc")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subscribe to Calendar Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSubscribeModalOpen(true)}
            className="h-8 text-xs font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-2 transition-all shadow-sm"
            title={tPortal("subscribeCalendarDesc")}
          >
            <CalendarSync strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{tPortal("subscribeCalendar")}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={isRefreshing}
            className="h-8 px-2 text-slate-600 dark:text-slate-300 dark:border-slate-700"
            title={tCommon("refresh")}
            aria-label={tCommon("refresh")}
          >
            <RefreshCw strokeWidth={1.5} className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-0.5" />

          {/* Week Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="h-8 px-2 text-slate-600 dark:text-slate-300"
              aria-label={tPortal("previousWeek")}
            >
              <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentWeekOffset(0)}
              className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:dark:bg-slate-800"
            >
              {currentWeekOffset === 0 ? tPortal("thisWeek") : tPortal("today")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="h-8 px-2 text-slate-600 dark:text-slate-300"
              aria-label={tPortal("nextWeek")}
            >
              <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
            </Button>

            <Badge variant="outline" className="ml-1 font-mono text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
              {weekRangeLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Helpful banner when teacher has no courses yet */}
      {courses.length === 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-start sm:items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 sm:mt-0 shrink-0" />
            <p className="text-slate-700 dark:text-slate-300">
              {tPortal("noCoursesBanner")}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsSubscribeModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 font-semibold text-xs h-8 shadow-sm"
          >
            {tPortal("subscribeNow")}
          </Button>
        </div>
      )}

      {/* Weekly Grid (Horizontal swipe on mobile, 7-column grid on desktop) */}
      <div className="md:hidden flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1">
        <span>&larr; {tPortal("swipeHint")} &rarr;</span>
        <span className="font-semibold text-blue-600">{tPortal("sevenDayWeek")}</span>
      </div>

      <div className="flex md:grid md:grid-cols-7 gap-3 overflow-x-auto pb-4 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weekDays.map((day) => {
          // Template + one-off overrides, keeping only lessons this teacher EFFECTIVELY teaches
          // (own courses minus handed-over lessons, plus lessons taken over as substitute)
          const dayInstances = resolveOccurrencesForDate(courses, overrides, day.dateStr).filter(
            (o) => o.teacherId === teacherId
          );

          return (
            <div
              key={day.dbName}
              className={`w-[84vw] max-w-[320px] sm:w-[280px] md:w-auto shrink-0 md:shrink snap-center md:snap-align-none rounded-xl border p-3 flex flex-col min-h-[220px] transition-all ${
                day.isToday
                  ? "bg-blue-50/40 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 ring-2 ring-blue-100 dark:ring-blue-950 shadow-sm"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className={`text-xs font-bold ${day.isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-800 dark:text-slate-200"}`}>
                  {day.name}
                </span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${day.isToday ? "bg-blue-600 text-white font-semibold" : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800"}`}>
                  {day.displayDate}
                </span>
              </div>

              {/* Day Course Cards */}
              <div className="space-y-2 flex-1">
                {dayInstances.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-3">
                    <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">{tPortal("noLessonOnDay")}</span>
                  </div>
                ) : (
                  dayInstances.map((occ, idx) => {
                    const { course } = occ;
                    // Effective schedule values (after override)
                    const schedule = {
                      ...occ.schedule,
                      start_time: occ.startTime,
                      duration: occ.duration,
                    } as unknown as CourseSchedule;
                    const gcalUrl = buildGoogleCalendarUrl({
                      text: course.name,
                      date: day.dateStr,
                      startTime: schedule.start_time,
                      durationHours: Number(schedule.duration) || 1.5,
                      location: course.rooms?.name || "",
                      details: buildGcalDetails(course),
                    });

                    return (
                      <div
                        key={`${course.id}-${occ.originalDate}-${occ.originalStartTime}-${idx}`}
                        onClick={() => handleOpenLesson(course, schedule, day.dateStr)}
                        className="group cursor-pointer rounded-xl p-3 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {course.name}
                          </span>
                          <div className="flex items-center space-x-1 shrink-0">
                            {course.course_type === "individual" ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                                {tPortal("individualShort")}
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                                {tPortal("groupShort")}
                              </span>
                            )}
                            <a
                              href={gcalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={tPortal("addToGoogle")}
                              className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/80 transition-colors"
                              aria-label={tPortal("addToGoogle")}
                            >
                              <GoogleCalendarIcon className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>

                        {/* Time & Duration Header */}
                        <div className="flex items-baseline justify-between gap-1 mb-1">
                          <div className="flex items-center space-x-1 font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                            <Clock strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{formatTimeRange(schedule.start_time, schedule.duration)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                            {schedule.duration} {tCommon("hourShort")}
                          </span>
                        </div>

                        {(occ.isMoved || occ.isSubstituted) && (
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            {occ.isMoved && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                                {tOv("badgeMoved")}
                              </span>
                            )}
                            {occ.isSubstituted && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300">
                                {tOv("badgeSubstitute")}
                              </span>
                            )}
                            {occ.isMoved && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                {tOv("regularTime", { time: occ.originalStartTime })}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Room if assigned */}
                        {course.rooms?.name && (
                          <div className="flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                            <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate">{course.rooms.name}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                            <Users strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                            <span>{(course.students || []).length} {tCommon("students")}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                            {tPortal("startLesson")}
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

      {/* Attendance & Lesson Modal Dialog */}
      {selectedInstance && (() => {
        const modalGcalUrl = buildGoogleCalendarUrl({
          text: selectedInstance.course.name,
          date: selectedDate,
          startTime: selectedInstance.schedule.start_time,
          durationHours: durationHours,
          location: selectedInstance.course.rooms?.name || "",
          details: buildGcalDetails(selectedInstance.course, notes),
        });

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-xl max-sm:rounded-b-none sm:max-w-lg sm:rounded-xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
              {/* Mobile Drag Indicator Bar */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
                <div>
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                    {tPortal("documentationAndAttendance")}
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <h3 className="text-xl font-bold">{selectedInstance.course.name}</h3>
                    {selectedInstance.course.course_type === "individual" ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-400/30">
                        {tPortal("individualRateBadge")}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-md border border-blue-400/30">
                        {tPortal("groupRateBadge")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-300">
                    <span>{tPortal("dateLabel")} <strong>{selectedDate}</strong></span>
                    <span>•</span>
                    <span>{tPortal("durationLabel")} <strong>{durationHours} {tCommon("hours")}</strong></span>
                    <span>•</span>
                    <span>{tPortal("roomLabel")} <strong>{selectedInstance.course.rooms?.name || tPortal("notAssigned")}</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <a
                    href={modalGcalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tPortal("addToGoogle")}
                    className="text-slate-400 hover:text-white p-2 rounded-xl active:scale-95 transition-all touch-manipulation flex items-center gap-1 text-xs"
                  >
                    <GoogleCalendarIcon className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setSelectedInstance(null)}
                    className="text-slate-400 hover:text-white p-2 rounded-xl active:scale-95 transition-all touch-manipulation"
                    aria-label={tCommon("close")}
                  >
                    <X strokeWidth={1.5} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSaveAttendance} className="p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                    <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 shrink-0" />
                    <span>
                      {actionType === "cancelled"
                        ? tPortal("cancellationBookedSuccess")
                        : tPortal("lessonBookedSuccess")}
                    </span>
                  </div>
                )}

                {/* 1. Status Switcher: Stunde durchgeführt vs. Schüler abgesagt */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {tPortal("statusSwitchLabel")}
                  </Label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setActionType("completed")}
                      className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        actionType === "completed"
                          ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <CheckCircle2 strokeWidth={1.5} className={`w-4 h-4 ${actionType === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                      <span>{tPortal("statusConducted")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType("cancelled")}
                      className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        actionType === "cancelled"
                          ? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <XCircle strokeWidth={1.5} className={`w-4 h-4 ${actionType === "cancelled" ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                      <span>{tPortal("statusStudentCancelled")}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Date & Duration Adjustments */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="lesson_date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tCommon("date")}
                    </Label>
                    <GermanDatePicker
                      id="lesson_date"
                      name="lesson_date"
                      value={selectedDate}
                      onChange={(iso) => setSelectedDate(iso)}
                      required
                      disabled={isSubmitting}
                      className="w-full text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="duration" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tPortal("durationLabel")}
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="8"
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1.5)}
                      required
                      disabled={isSubmitting}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* 3. Conditional Content based on actionType */}
                {actionType === "completed" ? (
                  <>
                    {/* Attendance Checklist */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          {tPortal("checkAttendanceTitle")}
                        </Label>
                        <span className="text-[11px] text-slate-400">
                          {(selectedInstance.course.students || []).length} {tCommon("students")}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 divide-y divide-slate-200/60 dark:divide-slate-700 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700">
                        {(selectedInstance.course.students || []).length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center italic">
                            {tLessons("noAttendance")}
                          </p>
                        ) : (
                          selectedInstance.course.students.map((student) => {
                            const isPresent = !!attendanceMap[student.id];

                            return (
                              <div
                                key={student.id}
                                onClick={() =>
                                  setAttendanceMap((prev) => ({
                                    ...prev,
                                    [student.id]: !prev[student.id],
                                  }))
                                }
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                  isPresent
                                    ? "bg-white dark:bg-slate-800 shadow-sm"
                                    : "opacity-60 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60"
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                      isPresent
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                                    }`}
                                  >
                                    {isPresent && <Check strokeWidth={1.5} className="w-4 h-4" />}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {student.first_name} {student.last_name}
                                  </span>
                                  {student.enrollment_status === "trial" && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white">
                                      {tStudents("statusTrial")}
                                    </span>
                                  )}
                                  {student.enrollment_status === "waiting" && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-500 text-white">
                                      {tStudents("statusWaiting")}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isPresent
                                      ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                      : "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                  }`}
                                >
                                  {isPresent ? tPortal("presentCheckbox") : tPortal("absentCheckbox")}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Lesson Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tPortal("notesLabel")}
                      </Label>
                      <Input
                        id="notes"
                        placeholder={tPortal("notesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Cancellation Rules Evaluation Alert */}
                    {cancellationResult.isLate ? (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-bold text-amber-900 dark:text-amber-200">
                            <AlertTriangle strokeWidth={1.5} className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{tPortal("lateCancellationTitle")}</span>
                          </div>
                          <Badge className="bg-amber-600 text-white font-semibold text-[10px]">
                            {tLessons("statusCancelledLate")}
                          </Badge>
                        </div>
                        <p className="text-amber-800 dark:text-amber-300 leading-relaxed text-[11px]">
                          {tPortal("lateCancellationDesc", {
                            hours: Math.max(0, cancellationResult.hoursUntilLesson),
                            limit: lateCancellationHours,
                            percent: lateCancellationPayPercent,
                          })}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 font-bold text-blue-900 dark:text-blue-200">
                            <Info strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{tPortal("timelyCancellationTitle")}</span>
                          </div>
                          <Badge variant="outline" className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold text-[10px]">
                            {tLessons("statusCancelledByStudent")}
                          </Badge>
                        </div>
                        <p className="text-blue-800 dark:text-blue-300 leading-relaxed text-[11px]">
                          {tPortal("timelyCancellationDesc", {
                            hours: Math.max(0, cancellationResult.hoursUntilLesson),
                            limit: lateCancellationHours,
                          })}
                        </p>
                      </div>
                    )}

                    {/* Notice that attendance check is omitted */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                      <p>{tPortal("attendanceNotNeededDesc")}</p>
                    </div>

                    {/* Cancellation Note */}
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tPortal("notesLabel")}
                      </Label>
                      <Input
                        id="notes"
                        placeholder={tPortal("cancellationNotesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSubmitting}
                        className="h-9 text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedInstance(null)}
                    disabled={isSubmitting}
                  >
                    {tCommon("cancel")}
                  </Button>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className={
                      actionType === "cancelled"
                        ? "bg-amber-600 hover:bg-amber-700 text-white space-x-2"
                        : "bg-blue-600 hover:bg-blue-700 text-white space-x-2"
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
                        <span>
                          {actionType === "cancelled"
                            ? tPortal("savingCancellation")
                            : tPortal("savingLesson")}
                        </span>
                      </>
                    ) : actionType === "cancelled" ? (
                      <>
                        <XCircle strokeWidth={1.5} className="w-4 h-4" />
                        <span>{tPortal("saveCancellationBtn")}</span>
                      </>
                    ) : (
                      <>
                        <Check strokeWidth={1.5} className="w-4 h-4" />
                        <span>{tPortal("bookLessonBtn")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Calendar Subscription Instruction Modal */}
      <CalendarSubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        teacherId={teacherId}
        teacherName={teacherName}
      />
    </div>
  );
}
