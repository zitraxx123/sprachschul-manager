"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GermanDatePicker } from "@/components/ui/german-date-picker";
import { 
  Calendar as CalendarIcon, 
  Filter, 
  User, 
  RotateCcw 
} from "lucide-react";

interface TeacherOption {
  id: string;
  name: string;
}

interface AbsenceFilterBarProps {
  currentPreset: string;
  currentFrom?: string;
  currentTo?: string;
  currentTeacherId?: string;
  teachers?: TeacherOption[];
  isTeacher?: boolean;
}

export function AbsenceFilterBar({
  currentPreset,
  currentFrom = "",
  currentTo = "",
  currentTeacherId = "",
  teachers = [],
  isTeacher = false,
}: AbsenceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);
  const [teacherId, setTeacherId] = useState(currentTeacherId);

  function applyPreset(preset: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    params.delete("from");
    params.delete("to");
    if (teacherId) {
      params.set("teacher_id", teacherId);
    }
    router.push(`/absences?${params.toString()}`);
  }

  function applyCustomRange(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    if (teacherId) {
      params.set("teacher_id", teacherId);
    } else {
      params.delete("teacher_id");
    }

    router.push(`/absences?${params.toString()}`);
  }

  function handleTeacherChange(newTeacherId: string) {
    setTeacherId(newTeacherId);
    const params = new URLSearchParams(searchParams.toString());
    if (newTeacherId) {
      params.set("teacher_id", newTeacherId);
    } else {
      params.delete("teacher_id");
    }
    router.push(`/absences?${params.toString()}`);
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setTeacherId("");
    router.push("/absences?range=today");
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 print:hidden">
      {/* Preset Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Zeitraum-Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPreset === "today"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Heute
          </button>

          <button
            type="button"
            onClick={() => applyPreset("this_week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPreset === "this_week"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Diese Woche
          </button>

          <button
            type="button"
            onClick={() => applyPreset("this_month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPreset === "this_month"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Dieser Monat
          </button>

          <button
            type="button"
            onClick={() => applyPreset("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentPreset === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Gesamter Zeitraum
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Filter zurücksetzen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Custom Date Inputs & Teacher Selector Form */}
      <form onSubmit={applyCustomRange} className="flex flex-wrap items-end gap-3 text-xs">
        <div className="space-y-1">
          <Label htmlFor="filter_from" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Von Datum:
          </Label>
          <GermanDatePicker
            id="filter_from"
            name="filter_from"
            value={from}
            onChange={(val) => setFrom(val)}
            className="w-36"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter_to" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Bis Datum:
          </Label>
          <GermanDatePicker
            id="filter_to"
            name="filter_to"
            value={to}
            onChange={(val) => setTo(val)}
            className="w-36"
          />
        </div>

        {/* Teacher Dropdown (Only for Admins) */}
        {!isTeacher && teachers.length > 0 && (
          <div className="space-y-1 min-w-[160px]">
            <Label htmlFor="filter_teacher" className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Lehrkraft filtern:</span>
            </Label>
            <select
              id="filter_teacher"
              value={teacherId}
              onChange={(e) => handleTeacherChange(e.target.value)}
              className="flex h-8 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-500">Alle Lehrkräfte</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="submit"
          size="sm"
          variant="secondary"
          className="h-8 text-xs font-semibold space-x-1"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Zeitraum anwenden</span>
        </Button>
      </form>
    </div>
  );
}
