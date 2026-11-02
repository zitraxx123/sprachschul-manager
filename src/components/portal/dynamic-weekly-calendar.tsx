"use client";

import dynamic from "next/dynamic";
import { CourseWithStudents } from "@/components/portal/weekly-calendar";
import { Calendar as CalendarIcon } from "lucide-react";

const WeeklyCalendar = dynamic(
  () => import("@/components/portal/weekly-calendar").then((m) => m.WeeklyCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center space-y-3 animate-pulse shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <CalendarIcon className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Wochenkalender wird geladen...</p>
      </div>
    ),
  }
);

export function DynamicWeeklyCalendar(props: {
  courses: CourseWithStudents[];
  teacherId: string;
  teacherName?: string;
  lateCancellationHours?: number;
  lateCancellationPayPercent?: number;
}) {
  return <WeeklyCalendar {...props} />;
}
