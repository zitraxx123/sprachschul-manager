"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createTeacher, TeacherActionState } from "@/actions/teachers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, X, User, Mail, Euro, Loader2, AlertCircle } from "lucide-react";

export function AddTeacherDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<TeacherActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createTeacher(prev, formData);
      if (res?.success) {
        setIsOpen(false);
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
          <span>Lehrkraft hinzufügen</span>
        </Button>
      ) : (
        <Card className="border-blue-200 bg-blue-50/20 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Neue Lehrkraft anlegen</CardTitle>
              <CardDescription>
                Erfassen Sie die Stammdaten und den vertraglichen Stundensatz
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

            <form action={formAction} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Name der Lehrkraft *</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="z. B. Anna Schmidt"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>E-Mail (optional)</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="anna.schmidt@email.de"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hourly_rate" className="flex items-center space-x-1.5">
                  <Euro className="w-3.5 h-3.5 text-slate-400" />
                  <span>Stundensatz (€ / Std.) *</span>
                </Label>
                <Input
                  id="hourly_rate"
                  name="hourly_rate"
                  type="number"
                  step="0.50"
                  min="0"
                  placeholder="30.00"
                  defaultValue="30.00"
                  required
                  disabled={isPending}
                />
              </div>

              <div className="sm:col-span-3 flex justify-end space-x-2 pt-2">
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
                    "Lehrkraft speichern"
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
