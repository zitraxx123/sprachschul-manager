"use client";

import { useState } from "react";
import { Course, Student, CourseSchedule } from "@/types/database";
import { recordCourseLesson } from "@/actions/attendance";
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
  DoorOpen 
} from "lucide-react";
import { formatTimeRange } from "@/lib/utils";

export interface CourseWithStudents extends Course {
  students: Student[];
  course_schedules: CourseSchedule[];
  rooms?: { id?: string; name: string } | null;
}

interface WeeklyCalendarProps {
  courses: CourseWithStudents[];
}

const GERMAN_DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export function WeeklyCalendar({ courses }: WeeklyCalendarProps) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedInstance, setSelectedInstance] = useState<{
    course: CourseWithStudents;
    schedule: CourseSchedule;
  } | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [durationHours, setDurationHours] = useState<number>(1.5);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Calculate current week dates based on offset
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  // Days since Monday (Monday = 0, Sunday = 6)
  const mondayOffset = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset + currentWeekOffset * 7);

  const weekDays = GERMAN_DAYS.map((dayName, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = d.toISOString().split("T")[0];
    const isToday = d.toDateString() === today.toDateString();
    return {
      name: dayName,
      date: d,
      dateStr,
      displayDate: d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      isToday,
    };
  });

  const weekRangeLabel = `${weekDays[0].displayDate} – ${weekDays[6].displayDate}.${weekDays[6].date.getFullYear()}`;

  function handleOpenLesson(course: CourseWithStudents, schedule: CourseSchedule, dateStr: string) {
    setSelectedInstance({ course, schedule });
    setSelectedDate(dateStr);
    setDurationHours(Number(schedule.duration || 1.5));
    setNotes("");
    setSubmitError(null);
    setSubmitSuccess(false);

    // Default all students to present (checked)
    const students = course.students || [];
    const initialAttendance: Record<string, boolean> = {};
    students.forEach((s) => {
      initialAttendance[s.id] = true;
    });
    setAttendanceMap(initialAttendance);
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInstance) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const students = selectedInstance.course.students || [];
    const attendances = students.map((s) => ({
      student_id: s.id,
      status: (attendanceMap[s.id] ? "present" : "absent") as "present" | "absent",
    }));

    const res = await recordCourseLesson(
      selectedInstance.course.id,
      selectedDate,
      attendances,
      notes,
      durationHours
    );

    setIsSubmitting(false);

    if (res?.error) {
      setSubmitError(res.error);
      toast.error(res.error || "Fehler beim Erfassen des Unterrichts");
    } else {
      toast.success("Unterrichtsstunde erfolgreich im Klassenbuch erfasst!");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Wochenplan &amp; Anwesenheit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klicken Sie auf einen Kurs, um den Unterricht durchzuführen und Anwesenheiten abzuhaken.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
            className="h-8 px-2 text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeekOffset(0)}
            className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:dark:bg-slate-800"
          >
            {currentWeekOffset === 0 ? "Diese Woche" : "Heute"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
            className="h-8 px-2 text-slate-600 dark:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Badge variant="outline" className="ml-2 font-mono text-xs bg-slate-50 border-slate-200">
            {weekRangeLabel}
          </Badge>
        </div>
      </div>

      {/* Weekly Grid (Horizontal swipe on mobile, 7-column grid on desktop) */}
      <div className="md:hidden flex items-center justify-between text-[11px] text-slate-400 px-1 pb-1">
        <span>&larr; Wischen für Wochentage &rarr;</span>
        <span className="font-semibold text-blue-600">7-Tage-Woche</span>
      </div>

      <div className="flex md:grid md:grid-cols-7 gap-3 overflow-x-auto pb-4 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weekDays.map((day) => {
          // Find all schedules running on this day for the teacher's courses
          const dayInstances: Array<{ course: CourseWithStudents; schedule: CourseSchedule }> = [];
          courses.forEach((c) => {
            (c.course_schedules || []).forEach((sched) => {
              if (sched.day_of_week === day.name) {
                dayInstances.push({ course: c, schedule: sched });
              }
            });
          });

          return (
            <div
              key={day.name}
              className={`w-[84vw] max-w-[320px] sm:w-[280px] md:w-auto shrink-0 md:shrink snap-center md:snap-align-none rounded-2xl border p-3 flex flex-col min-h-[220px] transition-all ${
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
                    <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">Kein Unterricht</span>
                  </div>
                ) : (
                  dayInstances.map(({ course, schedule }, idx) => (
                    <div
                      key={`${course.id}-${schedule.id || idx}`}
                      onClick={() => handleOpenLesson(course, schedule, day.dateStr)}
                      className="group cursor-pointer rounded-xl p-2.5 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                          {course.name}
                        </span>
                        {course.course_type === "individual" ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shrink-0">
                            1:1 Einzel
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 shrink-0">
                            Gruppe
                          </span>
                        )}
                      </div>

                      {/* Time & Duration Header */}
                      <div className="flex items-baseline justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-1 font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{formatTimeRange(schedule.start_time, schedule.duration)}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          {schedule.duration} Std.
                        </span>
                      </div>

                      {/* Room if assigned */}
                      {course.rooms?.name && (
                        <div className="flex items-center space-x-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium mb-1">
                          <DoorOpen className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{course.rooms.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{(course.students || []).length} Schüler</span>
                        </span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                          Unterricht starten &rarr;
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance & Lesson Modal Dialog */}
      {selectedInstance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-lg sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator Bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider">
                  Unterrichtsdokumentation &amp; Anwesenheit
                </span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <h3 className="text-xl font-bold">{selectedInstance.course.name}</h3>
                  {selectedInstance.course.course_type === "individual" ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-400/30">
                      Einzelunterricht (Einzelsatz)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-md border border-blue-400/30">
                      Gruppenkurs
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-300">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Zeit: <strong>{formatTimeRange(selectedInstance.schedule.start_time, durationHours)}</strong> ({durationHours} Std.)</span>
                  </span>
                  <span>•</span>
                  <span>{selectedInstance.schedule.day_of_week}</span>
                  {selectedInstance.course.rooms && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-slate-200">
                        <DoorOpen className="w-3 h-3 text-blue-400" />
                        <span>Raum: <strong>{selectedInstance.course.rooms.name}</strong></span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedInstance(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl active:scale-95 transition-all touch-manipulation"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveAttendance} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {submitError && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Stunde erfolgreich erfasst &amp; Anwesenheit gespeichert!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lesson Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal_date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Unterrichtsdatum *
                  </Label>
                  <GermanDatePicker
                    id="modal_date"
                    name="modal_date"
                    value={selectedDate}
                    onChange={(val) => setSelectedDate(val)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <Label htmlFor="modal_duration" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Unterrichtsdauer (Stunden) *
                  </Label>
                  <Input
                    id="modal_duration"
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseFloat(e.target.value) || 1.5)}
                    required
                    disabled={isSubmitting}
                    className="h-10 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Attendance Checklist */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Teilnehmer-Anwesenheit ({(selectedInstance.course.students || []).length} Schüler)
                  </Label>
                  {(selectedInstance.course.students || []).length > 0 && (
                    <div className="space-x-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const map: Record<string, boolean> = {};
                          (selectedInstance.course.students || []).forEach((s) => (map[s.id] = true));
                          setAttendanceMap(map);
                        }}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold touch-manipulation active:scale-95"
                      >
                        Alle anwesend
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          const map: Record<string, boolean> = {};
                          (selectedInstance.course.students || []).forEach((s) => (map[s.id] = false));
                          setAttendanceMap(map);
                        }}
                        className="text-slate-500 dark:text-slate-400 hover:underline font-medium touch-manipulation active:scale-95"
                      >
                        Alle abwesend
                      </button>
                    </div>
                  )}
                </div>

                {!(selectedInstance.course.students && selectedInstance.course.students.length > 0) ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-300">Diesem Kurs sind aktuell noch keine Schüler zugewiesen.</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Die Schulleitung kann Teilnehmer unter &quot;Kurse&quot; über &quot;Schüler verwalten&quot; zuordnen.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5 overscroll-contain">
                    {selectedInstance.course.students.map((student) => {
                      const isPresent = !!attendanceMap[student.id];

                      return (
                        <div
                          key={student.id}
                          onClick={() => {
                            setAttendanceMap((prev) => ({
                              ...prev,
                              [student.id]: !prev[student.id],
                            }));
                          }}
                          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer min-h-[48px] select-none touch-manipulation active:scale-[0.99] transition-all duration-150 ${
                            isPresent
                              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 opacity-70"
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                                isPresent
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                              }`}
                            >
                              {isPresent && <Check className="w-4 h-4 stroke-[2.5px]" />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight truncate">
                                {student.first_name} {student.last_name}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {student.email || student.phone || "Kursteilnehmer"}
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant={isPresent ? "success" : "secondary"}
                            className="text-[10px] shrink-0 font-semibold"
                          >
                            {isPresent ? "Anwesend" : "Abwesend"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lesson Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="modal_notes" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thema / Notizen (optional)
                </Label>
                <Input
                  id="modal_notes"
                  placeholder="z. B. Konjunktiv II Übungen, Telc Prüfungsvorbereitung"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800 pb-safe">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedInstance(null)}
                  disabled={isSubmitting}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || submitSuccess}
                  className="bg-blue-600 hover:bg-blue-700 space-x-1.5 font-semibold text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      <span>Wird gespeichert...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Stunde abschließen</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
