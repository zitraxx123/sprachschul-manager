"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { updateStudent, StudentActionState } from "@/actions/students";
import { Course, Student, CourseSchedule } from "@/types/database";
import { CourseCombobox } from "@/components/ui/course-combobox";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Pencil, 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  BookOpen, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

interface EditStudentDialogProps {
  student: Student;
  courses?: Array<Course & { course_schedules?: CourseSchedule[] }>;
  assignedCourseIds?: string[];
}

export function EditStudentDialog({ 
  student, 
  courses = [], 
  assignedCourseIds = [] 
}: EditStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(assignedCourseIds);
  const [courseName, setCourseName] = useState(student.course_name || "");

  // Sync state if student changes
  useEffect(() => {
    setSelectedCourseIds(assignedCourseIds);
    setCourseName(student.course_name || "");
  }, [student, assignedCourseIds]);

  const [state, formAction, isPending] = useActionState<StudentActionState | null, FormData>(
    async (prev, formData) => {
      const res = await updateStudent(prev, formData);
      if (res?.success) {
        toast.success("Schülerdaten erfolgreich aktualisiert!");
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
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
        title="Schülerdaten & Kurszuweisungen bearbeiten"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-lg sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">
                  Stammdaten &amp; Kurszuweisungen
                </span>
                <h3 className="text-lg font-bold mt-1 text-white">
                  Schüler bearbeiten: {student.first_name} {student.last_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-all active:scale-95 touch-manipulation"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form action={formAction} className="p-6 space-y-4 overflow-y-auto">
              <input type="hidden" name="student_id" value={student.id} />

              {/* Hidden inputs for selected courses */}
              {selectedCourseIds.map((id) => (
                <input key={id} type="hidden" name="course_ids" value={id} />
              ))}

              {state?.error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_first_name" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vorname *</span>
                  </Label>
                  <Input
                    id="edit_first_name"
                    name="first_name"
                    defaultValue={student.first_name}
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_last_name" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nachname *</span>
                  </Label>
                  <Input
                    id="edit_last_name"
                    name="last_name"
                    defaultValue={student.last_name}
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit_email" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>E-Mail (optional)</span>
                  </Label>
                  <Input
                    id="edit_email"
                    name="email"
                    type="email"
                    defaultValue={student.email || ""}
                    placeholder="schueler@email.de"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_phone" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Telefon (optional)</span>
                  </Label>
                  <Input
                    id="edit_phone"
                    name="phone"
                    type="tel"
                    defaultValue={student.phone || ""}
                    placeholder="+49 170 1234567"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Parent / Emergency Contact Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Elternkontakt / Notfallkontakt (optional)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hinterlegen Sie die Kontaktdaten der Eltern oder Erziehungsberechtigten für Minderjährige oder Notfälle.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit_parent_name" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Name der Eltern
                    </Label>
                    <Input
                      id="edit_parent_name"
                      name="parent_name"
                      defaultValue={student.parent_name || ""}
                      placeholder="z. B. Sabine Mustermann"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit_parent_phone" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Telefon der Eltern
                    </Label>
                    <Input
                      id="edit_parent_phone"
                      name="parent_phone"
                      type="tel"
                      defaultValue={student.parent_phone || ""}
                      placeholder="+49 170 9876543"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit_parent_email" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      E-Mail der Eltern
                    </Label>
                    <Input
                      id="edit_parent_email"
                      name="parent_email"
                      type="email"
                      defaultValue={student.parent_email || ""}
                      placeholder="eltern@email.de"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Course Multi-select Selection (Modern Combobox) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4">
                <CourseCombobox
                  courses={courses}
                  selectedIds={selectedCourseIds}
                  onChange={setSelectedCourseIds}
                  placeholder="Kurs nach Name oder Dozent suchen..."
                  disabled={isPending}
                />
              </div>

              {/* Course Note / Level */}
              <div className="space-y-1.5">
                <Label htmlFor="edit_course_name" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Zusätzliche Einstufung / Bemerkung</span>
                </Label>
                <Input
                  id="edit_course_name"
                  name="course_name"
                  placeholder="z. B. Niveau B2, Telc"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    "Änderungen speichern"
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
