"use client";

import { useState } from "react";
import { useActionState } from "react";
import { updateCourse, CourseActionState } from "@/actions/courses";
import { Teacher, Course, CourseSchedule, Room } from "@/types/database";
import { StudentOption } from "@/components/courses/add-course-dialog";
import { StudentCombobox } from "@/components/ui/student-combobox";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DAYS_OF_WEEK } from "@/components/courses/add-course-dialog";
import { 
  Pencil, 
  X, 
  Layers, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  FileText,
  DoorOpen
} from "lucide-react";

interface EditCourseDialogProps {
  course: Course;
  schedules: CourseSchedule[];
  teachers: Teacher[];
  rooms?: Room[];
  students?: StudentOption[];
  assignedStudentIds?: string[];
}

interface ScheduleDraft {
  tempId: string;
  day_of_week: string;
  start_time: string;
  duration: number;
}

export function EditCourseDialog({
  course,
  schedules: initialSchedules,
  teachers,
  rooms = [],
  students = [],
  assignedStudentIds = [],
}: EditCourseDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [courseType, setCourseType] = useState<"group" | "individual">(
    course.course_type === "individual" ? "individual" : "group"
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(assignedStudentIds);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(() => {
    if (initialSchedules && initialSchedules.length > 0) {
      return initialSchedules.map((s, idx) => ({
        tempId: s.id || `sched-${idx}`,
        day_of_week: s.day_of_week,
        start_time: s.start_time || "18:00",
        duration: Number(s.duration || 1.5),
      }));
    }
    return [{ tempId: "init-1", day_of_week: "Montag", start_time: "18:00", duration: 1.5 }];
  });

  const [state, formAction, isPending] = useActionState<CourseActionState | null, FormData>(
    async (prev, formData) => {
      const res = await updateCourse(prev, formData);
      if (res?.success) {
        toast.success("Kurs erfolgreich aktualisiert!");
        setIsOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  function handleOpen() {
    setCourseType(course.course_type === "individual" ? "individual" : "group");
    setSelectedStudentIds(assignedStudentIds);
    if (initialSchedules && initialSchedules.length > 0) {
      setSchedules(
        initialSchedules.map((s, idx) => ({
          tempId: s.id || `sched-${idx}`,
          day_of_week: s.day_of_week,
          start_time: s.start_time || "18:00",
          duration: Number(s.duration || 1.5),
        }))
      );
    } else {
      setSchedules([{ tempId: "init-1", day_of_week: "Montag", start_time: "18:00", duration: 1.5 }]);
    }
    setIsOpen(true);
  }

  function handleAddDay() {
    setSchedules((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        day_of_week: "Mittwoch",
        start_time: prev[prev.length - 1]?.start_time || "18:00",
        duration: prev[prev.length - 1]?.duration || 1.5,
      },
    ]);
  }

  function handleRemoveDay(tempId: string) {
    if (schedules.length <= 1) {
      toast.error("Ein Kurs muss mindestens einen Unterrichtstag haben.");
      return;
    }
    setSchedules((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function handleUpdateSchedule(tempId: string, field: keyof ScheduleDraft, value: string | number) {
    setSchedules((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, [field]: value } : s))
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="h-8 w-8 text-slate-500 hover:text-slate-800"
        title="Kurs bearbeiten"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="w-full max-sm:rounded-t-3xl sm:max-w-2xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Kurs bearbeiten</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Unterrichtsform, Raum, Dozent, Stundenplan und Teilnehmer anpassen
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-5">
              {state?.error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              <form id="edit-course-form" action={formAction} className="space-y-5">
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="course_type" value={courseType} />
                <input
                  type="hidden"
                  name="schedules_json"
                  value={JSON.stringify(
                    schedules.map((s) => ({
                      day_of_week: s.day_of_week,
                      start_time: s.start_time,
                      duration: s.duration,
                    }))
                  )}
                />
                <input
                  type="hidden"
                  name="student_ids_json"
                  value={JSON.stringify(selectedStudentIds)}
                />

                {/* Course Type Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kursart (Unterrichtsform) *
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setCourseType("group")}
                      className={`cursor-pointer p-3 rounded-xl border flex items-start space-x-3 transition-all select-none ${
                        courseType === "group"
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 ring-2 ring-blue-500/20 shadow-xs"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          courseType === "group"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                        }`}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Gruppenkurs</span>
                          {courseType === "group" && (
                            <span className="text-[10px] bg-blue-600 text-white font-semibold px-1.5 py-0.2 rounded">Aktiv</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Vergütung nach Gruppensatz der Lehrkraft.
                        </p>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setCourseType("individual");
                        if (selectedStudentIds.length > 1) {
                          setSelectedStudentIds(selectedStudentIds.slice(0, 1));
                        }
                      }}
                      className={`cursor-pointer p-3 rounded-xl border flex items-start space-x-3 transition-all select-none ${
                        courseType === "individual"
                          ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          courseType === "individual"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Einzelunterricht (1:1)</span>
                          {courseType === "individual" && (
                            <span className="text-[10px] bg-emerald-600 text-white font-semibold px-1.5 py-0.2 rounded">Aktiv</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Vergütung nach speziellem Einzelsatz der Lehrkraft.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name, Teacher & Room */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kursname *</span>
                    </Label>
                    <Input
                      id="edit_name"
                      name="name"
                      defaultValue={course.name}
                      required
                      disabled={isPending}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit_teacher_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Lehrkraft</span>
                    </Label>
                    <select
                      id="edit_teacher_id"
                      name="teacher_id"
                      defaultValue={course.teacher_id || ""}
                      disabled={isPending}
                      className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-500">-- Keine Lehrkraft --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Room Selection */}
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label htmlFor="edit_room_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Raum / Ort</span>
                    </Label>
                    <select
                      id="edit_room_id"
                      name="room_id"
                      defaultValue={course.room_id || ""}
                      disabled={isPending}
                      className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-500">-- Kein Raum zugewiesen --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit_description" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kursbeschreibung (optional)</span>
                  </Label>
                  <textarea
                    id="edit_description"
                    name="description"
                    rows={2}
                    defaultValue={course.description || ""}
                    placeholder="z. B. Vorbereitung auf das Goethe-Zertifikat B2..."
                    disabled={isPending}
                    className="flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  />
                </div>

                {/* Flexible Schedule (Stundenplan) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Stundenplan</span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                          Unterrichtstage und -zeiten
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-slate-200 dark:border-slate-700">
                      {schedules.length} {schedules.length === 1 ? "Tag" : "Tage"} / Woche
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    {schedules.map((schedule, index) => (
                      <div
                        key={schedule.tempId}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                      >
                        <div className="sm:col-span-1 flex items-center">
                          <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                        </div>

                        {/* Day of Week */}
                        <div className="sm:col-span-4">
                          <select
                            value={schedule.day_of_week}
                            onChange={(e) =>
                              handleUpdateSchedule(schedule.tempId, "day_of_week", e.target.value)
                            }
                            disabled={isPending}
                            className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            {DAYS_OF_WEEK.map((day) => (
                              <option key={day} value={day} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                {day}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Start Time */}
                        <div className="sm:col-span-3">
                          <div className="relative">
                            <Input
                              type="time"
                              value={schedule.start_time}
                              onChange={(e) =>
                                handleUpdateSchedule(schedule.tempId, "start_time", e.target.value)
                              }
                              disabled={isPending}
                              className="h-9 text-xs pl-7 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700"
                            />
                            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="sm:col-span-3">
                          <select
                            value={schedule.duration}
                            onChange={(e) =>
                              handleUpdateSchedule(
                                schedule.tempId,
                                "duration",
                                parseFloat(e.target.value)
                              )
                            }
                            disabled={isPending}
                            className="flex h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <option value="0.75" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">45 Min (0.75 Std.)</option>
                            <option value="1" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">60 Min (1.0 Std.)</option>
                            <option value="1.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">90 Min (1.5 Std.)</option>
                            <option value="2" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">120 Min (2.0 Std.)</option>
                            <option value="2.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">150 Min (2.5 Std.)</option>
                            <option value="3" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">180 Min (3.0 Std.)</option>
                          </select>
                        </div>

                        {/* Remove */}
                        <div className="sm:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isPending || schedules.length <= 1}
                            onClick={() => handleRemoveDay(schedule.tempId)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30"
                            title="Tag entfernen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddDay}
                      disabled={isPending}
                      className="w-full sm:w-auto h-8 text-xs font-medium border-dashed border-slate-300 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Weiteren Tag hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Schüler zuweisen (Modern Combobox Multi-Select) */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                  <StudentCombobox
                    students={students}
                    selectedIds={selectedStudentIds}
                    onChange={setSelectedStudentIds}
                    singleSelect={courseType === "individual"}
                    placeholder="Schüler suchen (z. B. Max Mustermann)..."
                    disabled={isPending}
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                form="edit-course-form"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  "Änderungen speichern"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
