"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createLesson, LessonActionState } from "@/actions/lessons";
import { Teacher, Student } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GermanDatePicker } from "@/components/ui/german-date-picker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, User, Calendar, Clock, BookOpen, AlertCircle, Loader2, GraduationCap } from "lucide-react";

interface AddLessonDialogProps {
  teachers: Teacher[];
  students?: Student[];
}

export function AddLessonDialog({ teachers, students = [] }: AddLessonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const tLessons = useTranslations("lessons");
  const tCommon = useTranslations("common");

  const [state, formAction, isPending] = useActionState<LessonActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createLesson(prev, formData);
      if (res?.success) {
        toast.success(tLessons("addLessonSuccess"));
        setIsOpen(false);
        setCourseName("");
        setSelectedStudentId("");
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    const found = students.find((s) => s.id === sId);
    if (found) {
      setCourseName(found.course_name || "");
    } else {
      setCourseName("");
    }
  };

  return (
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="space-x-2">
          <Plus strokeWidth={1.5} className="w-4 h-4" />
          <span>{tLessons("recordLesson")}</span>
        </Button>
      ) : (
        <Card className="border-blue-200 dark:border-slate-800 bg-blue-50/20 dark:bg-slate-900 shadow-md mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {tLessons("recordLessonTitle")}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {tLessons("recordLessonDesc")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setCourseName("");
                setSelectedStudentId("");
              }}
              className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X strokeWidth={1.5} className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {state?.error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Teacher Selection */}
                <div className="space-y-2">
                  <Label htmlFor="teacher_id" className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <User strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{tLessons("selectTeacher")}</span>
                  </Label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    required
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500">
                      {tLessons("selectPlaceholder")}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {t.name} ({Number(t.hourly_rate).toFixed(2)} €/{tCommon("hourShort")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Date */}
                <div className="space-y-2">
                  <Label htmlFor="lesson_date" className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{tCommon("date")} *</span>
                  </Label>
                  <GermanDatePicker
                    id="lesson_date"
                    name="lesson_date"
                    defaultValue={todayStr}
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Duration in Hours */}
                <div className="space-y-2">
                  <Label htmlFor="duration_hours" className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{tLessons("durationInHours")}</span>
                  </Label>
                  <Input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder={tLessons("durationPlaceholder")}
                    defaultValue="1.5"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Student Dropdown (from DB) */}
                <div className="space-y-2">
                  <Label htmlFor="student_id" className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <GraduationCap strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{tLessons("assignStudent")}</span>
                  </Label>
                  <select
                    id="student_id"
                    name="student_id"
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedStudentId}
                    onChange={handleStudentChange}
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-500">{tLessons("noStudentOption")}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {s.first_name} {s.last_name} ({s.course_name ? s.course_name : tCommon("student")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student / Group Text */}
                <div className="space-y-2">
                  <Label htmlFor="student_name" className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                    <BookOpen strokeWidth={1.5} className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <span>{tLessons("courseGroupLabel")}</span>
                  </Label>
                  <Input
                    id="student_name"
                    name="student_name"
                    placeholder={tLessons("courseGroupPlaceholder")}
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    disabled={isPending}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-700 dark:text-slate-200">{tLessons("notesTopicLabel")}</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder={tLessons("notesTopicPlaceholder")}
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Lesson Status */}
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {tLessons("statusLabel")}
                </Label>
                <select
                  id="status"
                  name="status"
                  defaultValue="completed"
                  disabled={isPending}
                  className="flex h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="completed" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tLessons("statusCompleted")}</option>
                  <option value="cancelled_by_student" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tLessons("statusCancelledByStudent")}</option>
                  <option value="cancelled_late" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">{tLessons("statusCancelledLate")}</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setCourseName("");
                    setSelectedStudentId("");
                  }}
                  disabled={isPending}
                  className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                    tLessons("saveLesson")
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
