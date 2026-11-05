"use client";

import { useState, useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { substituteTeacher, LessonActionState } from "@/actions/lessons";
import { Teacher } from "@/types/database";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeftRight,
  UserCheck,
  X,
  AlertCircle,
  Loader2,
  Calendar,
  User,
} from "lucide-react";

interface SubstituteTeacherDialogProps {
  lessonId: string;
  currentTeacherId: string;
  currentTeacherName: string;
  originalTeacherId?: string | null;
  originalTeacherName?: string | null;
  lessonDate: string;
  durationHours: number;
  studentOrCourseName: string;
  teachers: Teacher[];
}

export function SubstituteTeacherDialog({
  lessonId,
  currentTeacherId,
  currentTeacherName,
  originalTeacherId,
  originalTeacherName,
  lessonDate,
  durationHours,
  studentOrCourseName,
  teachers,
}: SubstituteTeacherDialogProps) {
  const t = useTranslations("lessons");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");

  const isSubstituted = Boolean(originalTeacherId && originalTeacherId !== currentTeacherId);

  const [state, formAction, isPending] = useActionState<LessonActionState | null, FormData>(
    async (prev, formData) => {
      const res = await substituteTeacher(prev, formData);
      if (res?.success) {
        toast.success(t("changeSubstituteSuccess"));
        setIsOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedTeacherId("");
          setIsOpen(true);
        }}
        className={`h-8 px-2.5 text-xs font-medium space-x-1 shadow-sm ${
          isSubstituted
            ? "border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
        title={t("substituteTeacher")}
      >
        <ArrowLeftRight strokeWidth={1.5} className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span>{t("substitution")}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/55 dark:bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-2xl sm:max-w-lg sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                  <ArrowLeftRight strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{t("substituteTeacher")}</span>
                  </h3>
                  <p className="text-xs text-amber-100">
                    {t("substituteTeacherDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                aria-label={tCommon("close")}
              >
                <X strokeWidth={1.5} className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form action={formAction} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <input type="hidden" name="lesson_id" value={lessonId} />

              {state?.error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start space-x-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* Lesson Info Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-2 font-medium">
                    <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                    {formatDate(lessonDate, locale)} ({durationHours} {tCommon("hourShort")})
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {studentOrCourseName}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                      {isSubstituted ? `${t("substitution")}:` : `${t("teacher")}:`}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {currentTeacherName}
                    </span>
                  </div>

                  {isSubstituted && originalTeacherName && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800">
                      {t("substitutionFor", { name: originalTeacherName })}
                    </Badge>
                  )}
                </div>
              </div>

              {/* New Teacher Selection */}
              <div className="space-y-2">
                <Label htmlFor="new_teacher_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                  <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                  <span>{t("selectSubstituteTeacher")} *</span>
                </Label>
                <select
                  id="new_teacher_id"
                  name="new_teacher_id"
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  disabled={isPending}
                  className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-500">
                    -- {t("selectSubstituteTeacher")} --
                  </option>
                  {teachers.map((tItem) => (
                    <option
                      key={tItem.id}
                      value={tItem.id}
                      disabled={tItem.id === currentTeacherId}
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {tItem.name} ({formatCurrency(Number(tItem.hourly_rate))} / {tCommon("hourShort")})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="text-xs"
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !selectedTeacherId || selectedTeacherId === currentTeacherId}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-1.5 animate-spin" />
                      {tCommon("saving")}
                    </>
                  ) : (
                    <>
                      <UserCheck strokeWidth={1.5} className="w-4 h-4 mr-1.5" />
                      {tCommon("save")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
