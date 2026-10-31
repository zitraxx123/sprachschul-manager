"use client";

import { useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  X, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  Euro, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Phone,
  FileText
} from "lucide-react";

export interface LessonAttendee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

export interface LessonAttendanceRecord {
  id: string;
  status: "present" | "absent";
  students: LessonAttendee | null;
}

export interface LessonDetailsDialogProps {
  lessonId: string;
  lessonDate: string;
  durationHours: number;
  teacherName: string;
  teacherHourlyRate?: number;
  courseOrStudentName: string;
  notes?: string | null;
  attendance: LessonAttendanceRecord[];
}

export function LessonDetailsDialog({
  lessonDate,
  durationHours,
  teacherName,
  teacherHourlyRate = 0,
  courseOrStudentName,
  notes,
  attendance = [],
}: LessonDetailsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presentList = attendance
    .filter((a) => a.status === "present")
    .map((a) => a.students)
    .filter((s): s is LessonAttendee => s !== null);

  const absentList = attendance
    .filter((a) => a.status === "absent")
    .map((a) => a.students)
    .filter((s): s is LessonAttendee => s !== null);

  const honorar = Number(durationHours) * Number(teacherHourlyRate);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 text-xs font-medium space-x-1 text-slate-700 hover:text-blue-600 hover:border-blue-300"
      >
        <Eye className="w-3.5 h-3.5 text-blue-600" />
        <span>Details</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-2xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Unterrichtsdetails &amp; Anwesenheitsbericht</span>
                </span>
                <h3 className="text-xl font-bold mt-1 text-white">
                  {courseOrStudentName || "Unterrichtseinheit"}
                </h3>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>{formatDate(lessonDate)}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>{durationHours} Std.</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-all active:scale-95 touch-manipulation"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                    <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>Lehrkraft</span>
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block">
                    {teacherName}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                    <BookOpen className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                    <span>Unterricht / Kurs</span>
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 block truncate">
                    {courseOrStudentName}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium block flex items-center space-x-1">
                    <Euro className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Honorar</span>
                  </span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                    {formatCurrency(honorar)}{" "}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      ({formatCurrency(teacherHourlyRate)}/h)
                    </span>
                  </span>
                </div>
              </div>

              {/* Lesson Theme / Notes */}
              {notes && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs">
                  <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-1">
                    Thema des Unterrichts &amp; Notizen:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
                </div>
              )}

              {/* Attendance Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <span>Teilnehmer-Anwesenheit</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {attendance.length} erfasst
                    </Badge>
                  </h4>
                </div>

                {attendance.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-850 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-medium text-slate-700 dark:text-slate-300">Keine Teilnehmer-Anwesenheit erfasst</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Dieser Unterricht wurde manuell angelegt oder als Einzelunterricht ohne Kursliste dokumentiert.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Anwesend Column (Green) */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>🟢 Anwesend ({presentList.length})</span>
                      </div>

                      <div className="bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 divide-y divide-emerald-100/60 dark:divide-emerald-900/40">
                        {presentList.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2 text-center">
                            Keine Schüler anwesend
                          </p>
                        ) : (
                          presentList.map((s) => (
                            <div key={s.id} className="pt-2 first:pt-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {s.first_name} {s.last_name}
                              </p>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
                                {s.email && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{s.email}</span>
                                  </div>
                                )}
                                {s.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{s.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Abwesend Column (Red) */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>🔴 Abwesend ({absentList.length})</span>
                      </div>

                      <div className="bg-rose-50/40 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-xl p-3 max-h-60 overflow-y-auto space-y-2 divide-y divide-rose-100/60 dark:divide-rose-900/40">
                        {absentList.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2 text-center">
                            Keine Abwesenheiten (alle anwesend)
                          </p>
                        ) : (
                          absentList.map((s) => (
                            <div key={s.id} className="pt-2 first:pt-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {s.first_name} {s.last_name}
                              </p>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 mt-0.5">
                                {s.email && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{s.email}</span>
                                  </div>
                                )}
                                {s.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{s.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
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
