"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarClock, Loader2, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  saveLessonOverride,
  resetLessonOverride,
  OverrideActionState,
} from "@/actions/lesson-overrides";
import { Teacher } from "@/types/database";

interface OccurrenceEditorProps {
  courseId: string;
  /** Teacher of the course template (the "regular" teacher) */
  courseTeacherId: string | null;
  courseTeacherName: string;
  /** Template values of the occurrence */
  originalDate: string; // YYYY-MM-DD
  originalStartTime: string; // HH:MM
  originalDuration: number;
  /** Effective values currently shown (after override) */
  currentDate: string;
  currentStartTime: string;
  currentDuration: number;
  currentTeacherId: string | null;
  hasOverride: boolean;
  isPast: boolean;
  teachers: Teacher[];
  onDone: () => void;
}

export function OccurrenceEditor({
  courseId,
  courseTeacherId,
  courseTeacherName,
  originalDate,
  originalStartTime,
  originalDuration,
  currentDate,
  currentStartTime,
  currentDuration,
  currentTeacherId,
  hasOverride,
  isPast,
  teachers,
  onDone,
}: OccurrenceEditorProps) {
  const t = useTranslations("overrides");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState(currentStartTime);
  const [duration, setDuration] = useState(String(currentDuration));
  const [teacherId, setTeacherId] = useState(currentTeacherId || courseTeacherId || "");
  const [reason, setReason] = useState("");

  function errorMessage(res: OverrideActionState): string {
    const detail = res.detail || "";
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "invalid":
        return t("errInvalid");
      case "notFound":
        return t("errNotFound");
      case "teacherBusy":
        return t("errTeacherBusy", { detail });
      case "roomBusy":
        return t("errRoomBusy", { detail });
      default:
        return t("errDb", { detail });
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveLessonOverride({
        courseId,
        originalDate,
        originalStartTime,
        newDate: date,
        newStartTime: startTime,
        newDuration: parseFloat(duration.replace(",", ".")),
        newTeacherId: teacherId || null,
        reason,
      });
      if (res.success) {
        toast.success(t("saved"));
        router.refresh();
        onDone();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const res = await resetLessonOverride(courseId, originalDate, originalStartTime);
      if (res.success) {
        toast.success(t("resetDone"));
        router.refresh();
        onDone();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  if (isPast) {
    return (
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-start space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <Info strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t("pastReadonly")}</span>
      </div>
    );
  }

  const selectClass =
    "w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:[color-scheme:dark]";

  return (
    <form
      onSubmit={handleSave}
      className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm space-y-3"
    >
      <div>
        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center space-x-2">
          <CalendarClock strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("editTitle")}</span>
        </span>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t("editHint")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("date")}</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("startTime")}</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("duration")}</Label>
          <Input
            type="number"
            step="0.25"
            min="0.25"
            max="12"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
            className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-slate-700 dark:text-slate-300">{t("substituteTeacher")}</Label>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={selectClass}>
          {courseTeacherId && (
            <option value={courseTeacherId}>{t("keepTeacher", { name: courseTeacherName })}</option>
          )}
          {teachers
            .filter((tc) => tc.id !== courseTeacherId)
            .map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name}
              </option>
            ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-slate-700 dark:text-slate-300">{t("reason")}</Label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          maxLength={200}
          className="h-9 text-sm dark:bg-slate-900 dark:text-white dark:[color-scheme:dark]"
        />
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500">
        {t("regularTime", {
          time: `${originalStartTime} · ${originalDuration}`,
        })}
        {" · "}
        {t("permanentHint")}
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8"
        >
          {isPending ? (
            <>
              <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-1.5 animate-spin" />
              {t("saving")}
            </>
          ) : (
            t("save")
          )}
        </Button>

        {hasOverride && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={handleReset}
            className="text-xs font-semibold h-8 dark:border-slate-700 dark:text-slate-200"
          >
            <RotateCcw strokeWidth={1.5} className="w-4 h-4 mr-1.5" />
            {t("reset")}
          </Button>
        )}
      </div>
    </form>
  );
}
