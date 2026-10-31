"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createLesson, LessonActionState } from "@/actions/lessons";
import { Teacher } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, User, Calendar, Clock, BookOpen, AlertCircle, Loader2 } from "lucide-react";

interface AddLessonDialogProps {
  teachers: Teacher[];
}

export function AddLessonDialog({ teachers }: AddLessonDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<LessonActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createLesson(prev, formData);
      if (res?.success) {
        setIsOpen(false);
      }
      return res;
    },
    null
  );

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div>
      {!isOpen ? (
        <Button onClick={() => setIsOpen(true)} className="space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Unterrichtsstunde erfassen</span>
        </Button>
      ) : (
        <Card className="border-blue-200 bg-blue-50/20 shadow-md mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Unterrichtseinheit dokumentieren</CardTitle>
              <CardDescription>
                Erfassen Sie gehaltene Stunden für die automatische Honorarabrechnung
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Teacher Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="teacher_id" className="flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Lehrkraft *</span>
                  </Label>
                  <select
                    id="teacher_id"
                    name="teacher_id"
                    required
                    disabled={isPending}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Bitte wählen...
                    </option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({Number(t.hourly_rate).toFixed(2)} €/h)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lesson Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="lesson_date" className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Datum *</span>
                  </Label>
                  <Input
                    id="lesson_date"
                    name="lesson_date"
                    type="date"
                    defaultValue={todayStr}
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Duration in Hours */}
                <div className="space-y-1.5">
                  <Label htmlFor="duration_hours" className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dauer in Stunden *</span>
                  </Label>
                  <Input
                    id="duration_hours"
                    name="duration_hours"
                    type="number"
                    step="0.25"
                    min="0.25"
                    placeholder="1.5 (für 90 Min)"
                    defaultValue="1.5"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Student / Group */}
                <div className="space-y-1.5">
                  <Label htmlFor="student_name" className="flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>Schüler / Kursbezeichnung (optional)</span>
                  </Label>
                  <Input
                    id="student_name"
                    name="student_name"
                    placeholder="z. B. Intensivkurs Deutsch B2 oder Max M."
                    disabled={isPending}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notizen / Unterrichtsthema (optional)</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="z. B. Konversationsübung, Telc Vorbereitung"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
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
                    "Stunde erfassen"
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
