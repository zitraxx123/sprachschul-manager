"use client";

import { useState } from "react";
import { Student, MonthlyPayment } from "@/types/database";
import { CourseInfoData } from "@/components/courses/course-info-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Phone, 
  Mail, 
  Clock, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ShieldCheck, 
  Layers, 
  BookOpen 
} from "lucide-react";

interface StudentProfileDialogProps {
  student: Student;
  courses: CourseInfoData[];
  payment?: MonthlyPayment | null;
  currentMonthYear?: string;
  children: React.ReactNode;
}

export function StudentProfileDialog({
  student,
  courses = [],
  payment,
  currentMonthYear,
  children,
}: StudentProfileDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isPaid = !!payment?.is_paid;
  const fullName = `${student.first_name} ${student.last_name}`;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} in die Zwischenablage kopiert!`);
  }

  return (
    <>
      <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
        {children}
      </span>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl sm:max-w-xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile drag handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Profile Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white flex items-start justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center font-bold text-xl text-white shadow-inner shrink-0">
                  {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
                      Schülerakte
                    </span>
                    {isPaid ? (
                      <Badge variant="success" className="text-[10px] py-0 px-2 font-bold bg-emerald-500 text-white border-none">
                        ✓ Bezahlt
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] py-0 px-2 font-bold bg-red-500 text-white border-none">
                        Beitrag offen
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black leading-tight text-white">
                    {fullName}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Registriert seit: {student.created_at ? formatDate(student.created_at) : "Systemstart"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl active:scale-95 transition-all touch-manipulation"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* 1. Direkte Kontaktdaten */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Persönliche Kontaktdaten (Schüler)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Phone */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Telefon / Mobil</span>
                      {student.phone ? (
                        <a
                          href={`tel:${student.phone}`}
                          className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 hover:underline block truncate mt-0.5"
                        >
                          {student.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Nicht angegeben</span>
                      )}
                    </div>
                    {student.phone && (
                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(student.phone!, "Telefonnummer")}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Kopieren"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <a
                          href={`tel:${student.phone}`}
                          className="h-7 px-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center space-x-1 hover:bg-blue-700 active:scale-95 transition-all"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Anrufen</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">E-Mail-Adresse</span>
                      {student.email ? (
                        <a
                          href={`mailto:${student.email}`}
                          className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline block truncate mt-0.5"
                        >
                          {student.email}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Nicht angegeben</span>
                      )}
                    </div>
                    {student.email && (
                      <div className="flex items-center space-x-1 shrink-0 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(student.email!, "E-Mail-Adresse")}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Kopieren"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <a
                          href={`mailto:${student.email}`}
                          className="h-7 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1 hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Mail</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Elternkontakt / Notfallkontakt */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Elternkontakt / Notfalltelefon
                    </h4>
                  </div>
                  {student.parent_phone && (
                    <span className="text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      Notfallkontakt hinterlegt
                    </span>
                  )}
                </div>

                {(student.parent_name || student.parent_phone || student.parent_email) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Name der Eltern</span>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                        {student.parent_name || "—"}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Telefon Eltern</span>
                        {student.parent_phone ? (
                          <a href={`tel:${student.parent_phone}`} className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline block truncate mt-0.5">
                            {student.parent_phone}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                      {student.parent_phone && (
                        <a
                          href={`tel:${student.parent_phone}`}
                          className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 ml-1 shrink-0"
                          title="Eltern anrufen"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">E-Mail Eltern</span>
                        {student.parent_email ? (
                          <a href={`mailto:${student.parent_email}`} className="text-xs font-bold text-slate-800 dark:text-slate-200 hover:underline block truncate mt-0.5">
                            {student.parent_email}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </div>
                      {student.parent_email && (
                        <a
                          href={`mailto:${student.parent_email}`}
                          className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 ml-1 shrink-0"
                          title="Mail an Eltern senden"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-blue-100 dark:border-blue-900/40 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Aktuell keine Eltern- oder Notfallkontakte für diesen Schüler hinterlegt.
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Zugeordnete Kurse & Stundenplan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Zugeordnete Kurse ({courses.length})</span>
                  </h4>
                </div>

                {courses.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    Dieser Schüler ist aktuell keinem Kurs zugeordnet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {courses.map((c) => {
                      const isIndividual = c.course_type === "individual";
                      const schedules = c.course_schedules || [];
                      const teacher = c.teachers;

                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{c.name}</span>
                                {isIndividual ? (
                                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] py-0 font-bold">
                                    Einzelunterricht
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 text-[10px] py-0 font-bold">
                                    Gruppenkurs
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Lehrkraft: <strong>{teacher?.name || "Keine Lehrkraft"}</strong>
                                {teacher?.phone && (
                                  <a href={`tel:${teacher.phone}`} className="ml-1.5 text-blue-600 dark:text-blue-400 hover:underline font-mono">
                                    ({teacher.phone})
                                  </a>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Schedules */}
                          {schedules.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                              {schedules.map((s, idx) => (
                                <Badge
                                  key={s.id || idx}
                                  variant="outline"
                                  className="bg-slate-50 dark:bg-slate-900 font-medium text-[10px] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 py-0.5"
                                >
                                  <Clock className="w-3 h-3 mr-1 text-slate-400" />
                                  <span>{s.day_of_week}, {s.start_time} Uhr ({s.duration}h)</span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Zusätzliche Einstufung / Bemerkung */}
              {student.course_name && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Zusätzliche Einstufung / Notiz</span>
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                    {student.course_name}
                  </p>
                </div>
              )}

              {/* 5. Aktueller Abrechnungsstatus */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider block">
                    Monatsbeitrag ({currentMonthYear || "Aktueller Monat"})
                  </span>
                  <div className="flex items-center space-x-2 mt-0.5">
                    {isPaid ? (
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Bezahlt: {formatCurrency(Number(payment?.amount_euro || 0))}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center space-x-1">
                        <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                        <span>Noch nicht bezahlt</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
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
