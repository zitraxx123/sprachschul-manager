"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createStudent, StudentActionState } from "@/actions/students";
import { Course, CourseSchedule } from "@/types/database";
import { CourseCombobox } from "@/components/ui/course-combobox";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  BookOpen, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

interface AddStudentDialogProps {
  courses?: Array<Course & { course_schedules?: CourseSchedule[] }>;
}

export function AddStudentDialog({ courses = [] }: AddStudentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseName, setCourseName] = useState("");

  const [state, formAction, isPending] = useActionState<StudentActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createStudent(prev, formData);
      if (res?.success) {
        toast.success("Schüler erfolgreich angelegt!");
        setIsOpen(false);
        setSelectedCourseIds([]);
        setCourseName("");
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Schüler hinzufügen</span>
        </Button>
      ) : (
        <Card className="border-blue-200 bg-blue-50/20 shadow-md mb-6 animate-in fade-in duration-150">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Neuen Schüler erfassen</CardTitle>
              <CardDescription>
                Stammdaten und Zuweisung zu einem oder mehreren Kursen (Multi-Zuweisung)
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setSelectedCourseIds([]);
                setCourseName("");
              }}
              className="h-8 w-8 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {state?.error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4">
              {/* Hidden inputs for selected courses */}
              {selectedCourseIds.map((id) => (
                <input key={id} type="hidden" name="course_ids" value={id} />
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Vorname *</span>
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    placeholder="z. B. Max"
                    required
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Nachname *</span>
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    placeholder="z. B. Mustermann"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>E-Mail (optional)</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="max.mustermann@email.de"
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Telefon (optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+49 170 1234567"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Parent / Emergency Contact Section */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Elternkontakt / Notfallkontakt (optional)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hinterlegen Sie die Kontaktdaten der Eltern oder Erziehungsberechtigten für Minderjährige oder Notfälle.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="parent_name" className="text-[11px] font-semibold text-slate-700">
                      Name der Eltern
                    </Label>
                    <Input
                      id="parent_name"
                      name="parent_name"
                      placeholder="z. B. Sabine Mustermann"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="parent_phone" className="text-[11px] font-semibold text-slate-700">
                      Telefon der Eltern
                    </Label>
                    <Input
                      id="parent_phone"
                      name="parent_phone"
                      type="tel"
                      placeholder="+49 170 9876543"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="parent_email" className="text-[11px] font-semibold text-slate-700">
                      E-Mail der Eltern
                    </Label>
                    <Input
                      id="parent_email"
                      name="parent_email"
                      type="email"
                      placeholder="eltern@email.de"
                      disabled={isPending}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Course Multi-select Selection (Modern Combobox) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
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
                <Label htmlFor="course_name" className="flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Zusätzliche Einstufung / Bemerkung (optional)</span>
                </Label>
                <Input
                  id="course_name"
                  name="course_name"
                  placeholder="z. B. Niveau B2, Prüfungsvorbereitung Telc"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedCourseIds([]);
                    setCourseName("");
                  }}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Schüler anlegen"
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
