"use client";

import { useState, useTransition } from "react";
import { updateCourseStudents } from "@/actions/courses";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { StudentCombobox } from "@/components/ui/student-combobox";
import { 
  Users, 
  X, 
  Check, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  UserCheck 
} from "lucide-react";

export interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_email?: string | null;
  course_id?: string | null;
  enrolledCourseCount?: number;
  course_name?: string | null;
}

interface ManageCourseStudentsDialogProps {
  courseId: string;
  courseName: string;
  allStudents: StudentOption[];
  assignedStudentIds: string[];
}

export function ManageCourseStudentsDialog({
  courseId,
  courseName,
  allStudents,
  assignedStudentIds,
}: ManageCourseStudentsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(assignedStudentIds);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setSelectedIds(assignedStudentIds);
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setIsOpen(false);
  }

  async function handleSave() {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await updateCourseStudents(courseId, selectedIds);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Kursteilnehmer erfolgreich zugewiesen!");
        setSuccess(true);
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 800);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-8 text-xs font-medium space-x-1.5 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500"
      >
        <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span>Schüler verwalten</span>
        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          {assignedStudentIds.length}
        </span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-850">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Kursteilnehmer zuordnen</span>
                </span>
                <h3 className="text-lg font-bold mt-1 text-white">
                  Schüler für &quot;{courseName}&quot; verwalten
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Wählen Sie die Teilnehmer aus, die diesem Kurs fest zugewiesen werden.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-all active:scale-95 touch-manipulation"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Schülerzuweisung erfolgreich gespeichert!</span>
                </div>
              )}

              {/* Combobox Search & Multi-Select */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                <StudentCombobox
                  students={allStudents}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                  placeholder="Schüler suchen (z. B. Max Mustermann)..."
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                <strong>{selectedIds.length}</strong> von {allStudents.length} Schülern gewählt
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending || success}
                  className="bg-blue-600 hover:bg-blue-700 space-x-1.5"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Speichern...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Zuweisung speichern</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
