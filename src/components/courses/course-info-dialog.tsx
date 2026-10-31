"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Layers, 
  User, 
  Calendar, 
  Clock, 
  X, 
  Mail, 
  Phone, 
  FileText,
  DoorOpen 
} from "lucide-react";
import { formatTimeRange } from "@/lib/utils";

export interface CourseInfoData {
  id: string;
  name: string;
  course_type?: "group" | "individual" | string | null;
  description?: string | null;
  rooms?: {
    id?: string;
    name: string;
  } | null;
  teachers?: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  course_schedules?: Array<{
    id?: string;
    day_of_week: string;
    start_time: string;
    duration: number;
  }>;
}

interface CourseInfoDialogProps {
  course: CourseInfoData;
  children: React.ReactNode;
}

export function CourseInfoDialog({ course, children }: CourseInfoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isIndividual = course.course_type === "individual";
  const schedules = course.course_schedules || [];
  const teacher = course.teachers;

  return (
    <>
      <span onClick={() => setIsOpen(true)} className="inline-block">
        {children}
      </span>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[90dvh] max-sm:rounded-t-3xl sm:max-w-md sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile drag bar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-start space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                    isIndividual
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Kursinformation
                    </span>
                    {isIndividual ? (
                      <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] py-0 font-bold">
                        1:1 Einzelunterricht
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-[10px] py-0 font-bold">
                        Gruppenkurs
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 leading-tight">
                    {course.name}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg active:scale-95 transition-all"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Teacher Info */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 dark:bg-slate-800 shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Zugeordnete Lehrkraft</span>
                </span>

                {teacher ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{teacher.name}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-mono border border-blue-100 dark:border-blue-900/50"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{teacher.phone}</span>
                        </a>
                      )}
                      {teacher.email && (
                        <a
                          href={`mailto:${teacher.email}`}
                          className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 hover:underline bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600"
                        >
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{teacher.email}</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">Aktuell keine Lehrkraft zugewiesen</p>
                )}
              </div>

              {/* Schedule / Stundenplan */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Reguläre Unterrichtszeiten</span>
                </span>

                {schedules.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">Keine festen Termine hinterlegt</p>
                ) : (
                  <div className="space-y-1.5">
                    {schedules.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">{s.day_of_week}</span>
                        <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                          <span>{formatTimeRange(s.start_time, s.duration)} ({s.duration} Std.)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Room (if assigned) */}
              {course.rooms && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-2xs space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <DoorOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Unterrichtsort / Raum</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{course.rooms.name}</p>
                </div>
              )}

              {/* Description */}
              {course.description && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-2xs space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Kursbeschreibung / Programm</span>
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {course.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
