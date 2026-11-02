"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createCourse, CourseActionState } from "@/actions/courses";
import { getAvailableRoomsForSchedules, OccupiedRoomInfo } from "@/actions/rooms";
import { Teacher, Room } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StudentCombobox } from "@/components/ui/student-combobox";
import { 
  Plus, 
  X, 
  Layers, 
  User, 
  Users, 
  Calendar, 
  Clock, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  FileText,
  DoorOpen,
  Euro
} from "lucide-react";

export interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

interface AddCourseDialogProps {
  teachers: Teacher[];
  rooms?: Room[];
  students?: StudentOption[];
}

export const DAYS_OF_WEEK = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

interface ScheduleDraft {
  tempId: string;
  day_of_week: string;
  start_time: string;
  duration: number;
}

export function AddCourseDialog({ teachers, rooms = [], students = [] }: AddCourseDialogProps) {
  const t = useTranslations("courses");
  const tCommon = useTranslations("common");
  const tSchedule = useTranslations("schedule");

  const [isOpen, setIsOpen] = useState(false);
  const [courseType, setCourseType] = useState<"group" | "individual">("group");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([
    { tempId: "init-1", day_of_week: "Montag", start_time: "18:00", duration: 1.5 },
  ]);

  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [availableRooms, setAvailableRooms] = useState<Room[]>(rooms);
  const [occupiedRooms, setOccupiedRooms] = useState<OccupiedRoomInfo[]>([]);
  const [isCheckingRooms, setIsCheckingRooms] = useState(false);

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

  useEffect(() => {
    let isCancelled = false;

    async function checkAvailability() {
      const validSchedules = schedules.filter((s) => s.day_of_week && s.start_time);
      if (validSchedules.length === 0) {
        setAvailableRooms(rooms);
        setOccupiedRooms([]);
        return;
      }

      setIsCheckingRooms(true);
      try {
        const res = await getAvailableRoomsForSchedules({
          schedules: validSchedules.map((s) => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            duration: Number(s.duration || 1.0),
          })),
        });

        if (!isCancelled && res.success) {
          setAvailableRooms(res.availableRooms);
          setOccupiedRooms(res.occupiedRooms);

          if (selectedRoomId && !res.availableRooms.some((r) => r.id === selectedRoomId)) {
            setSelectedRoomId("");
          }
        }
      } catch (err) {
        console.error("Error checking room availability:", err);
      } finally {
        if (!isCancelled) setIsCheckingRooms(false);
      }
    }

    checkAvailability();

    return () => {
      isCancelled = true;
    };
  }, [schedules, rooms]);

  const [state, formAction, isPending] = useActionState<CourseActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createCourse(prev, formData);
      if (res?.success) {
        toast.success(tCommon("saved"));
        setIsOpen(false);
        setSelectedStudentIds([]);
        setSelectedRoomId("");
        setSchedules([
          { tempId: "init-1", day_of_week: "Montag", start_time: "18:00", duration: 1.5 },
        ]);
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

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
      toast.error(t("daysPerWeek"));
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
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="space-x-2 shadow-xs">
          <Plus strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("addCourse")}</span>
        </Button>
      ) : (
        <Card className="border-blue-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl mb-6 ring-1 ring-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("addCourse")}</CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("subtitle")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-5">
            {state?.error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-5">
              {/* Hidden serialized schedules, course_type and student_ids */}
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
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("courseType")} *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      setCourseType("group");
                    }}
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
                      <Users strokeWidth={1.5} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("group")}</span>
                        {courseType === "group" && (
                          <span className="text-[10px] bg-blue-600 text-white font-semibold px-1.5 py-0.2 rounded">{tCommon("active")}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("groupDesc")}
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
                      <User strokeWidth={1.5} className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("individual")}</span>
                        {courseType === "individual" && (
                          <span className="text-[10px] bg-emerald-600 text-white font-semibold px-1.5 py-0.2 rounded">{tCommon("active")}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("individualDesc")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Name, Capacity, Monthly Price, Teacher & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Layers strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{tCommon("name")} *</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Deutsch B2"
                    required
                    disabled={isPending}
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_capacity" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Users strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{t("maxCapacity")} *</span>
                  </Label>
                  <Input
                    id="max_capacity"
                    name="max_capacity"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue={courseType === "individual" ? 1 : 10}
                    key={courseType}
                    required
                    disabled={isPending}
                    className="h-10 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_price" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Euro strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{t("monthlyPrice")} *</span>
                  </Label>
                  <Input
                    id="monthly_price"
                    name="monthly_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="150.00"
                    defaultValue="0"
                    disabled={isPending}
                    className="h-10 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    <span>{t("teacher")}</span>
                  </Label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue=""
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-500">-- {t("noTeacher")} --</option>
                    {teachers.map((tItem) => (
                      <option key={tItem.id} value={tItem.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {tItem.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="room_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                      <DoorOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                      <span>{t("room")}</span>
                    </Label>
                    {isCheckingRooms ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Loader2 strokeWidth={1.5} className="w-3.5 h-3.5 animate-spin" />
                        {t("checkingRooms")}
                      </span>
                    ) : occupiedRooms.length > 0 ? (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {occupiedRooms.length} {t("roomsOccupied")}
                      </span>
                    ) : null}
                  </div>
                  <select
                    id="room_id"
                    name="room_id"
                    disabled={isPending}
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {availableRooms.length === 0 ? (
                      <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-400">
                        {t("noRoomsFree")}
                      </option>
                    ) : (
                      <>
                        <option value="" className="bg-white dark:bg-slate-800 text-slate-500">
                          -- {t("noRoom")} --
                        </option>
                        {availableRooms.map((r) => (
                          <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                            {r.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {availableRooms.length === 0 && (
                    <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 font-medium mt-1">
                      <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0" />
                      {t("noRoomsFree")}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <FileText strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("description")}</span>
                </Label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  placeholder={t("descriptionPlaceholder")}
                  disabled={isPending}
                  className="flex w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>

              {/* Flexible Schedule (Stundenplan) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("schedule")}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                        {t("regularSchedule")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-slate-200 dark:border-slate-700">
                    {schedules.length} {t("daysPerWeek")}
                  </Badge>
                </div>

                <div className="space-y-2">
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
                              {getDayLabel(day)}
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
                          <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400 absolute left-2 top-2.5 pointer-events-none" />
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
                          <option value="0.75" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration45")}</option>
                          <option value="1" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration60")}</option>
                          <option value="1.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration90")}</option>
                          <option value="2" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration120")}</option>
                          <option value="2.5" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration150")}</option>
                          <option value="3" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tSchedule("duration180")}</option>
                        </select>
                      </div>

                      {/* Remove day button */}
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isPending || schedules.length <= 1}
                          onClick={() => handleRemoveDay(schedule.tempId)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-30"
                          title={t("removeDay")}
                        >
                          <Trash2 strokeWidth={1.5} className="w-4 h-4" />
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
                    <Plus strokeWidth={1.5} className="w-4 h-4 mr-1" />
                    {t("addDay")}
                  </Button>
                </div>
              </div>

              {/* Schüler zuweisen (Modern Combobox Multi-Select) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                <StudentCombobox
                  students={students}
                  selectedIds={selectedStudentIds}
                  onChange={setSelectedStudentIds}
                  singleSelect={courseType === "individual"}
                  placeholder={t("searchStudentPlaceholder")}
                  disabled={isPending}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending ? (
                    <>
                      <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                      {tCommon("saving")}
                    </>
                  ) : (
                    t("addCourse")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
