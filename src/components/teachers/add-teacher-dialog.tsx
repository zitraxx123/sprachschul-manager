"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createTeacher, TeacherActionState } from "@/actions/teachers";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GermanDatePicker } from "@/components/ui/german-date-picker";
import { 
  Plus, 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Euro, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  UserCheck, 
  Clock 
} from "lucide-react";

export function AddTeacherDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvancedRates, setShowAdvancedRates] = useState(false);

  const [state, formAction, isPending] = useActionState<TeacherActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createTeacher(prev, formData);
      if (res?.success) {
        toast.success("Lehrkraft erfolgreich angelegt!");
        setIsOpen(false);
        setShowAdvancedRates(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
      return res;
    },
    null
  );

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="space-x-1.5 shadow-sm">
        <Plus className="w-4 h-4" />
        <span>Lehrkraft anlegen</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-2xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">
                  Dozentenverwaltung
                </span>
                <h3 className="text-xl font-bold mt-0.5 text-white">Neue Lehrkraft anlegen</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Erfassen Sie Kontaktdaten, Geburtsdatum und differenzierte Honorarsätze
                </p>
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

            {/* Modal Body / Form */}
            <form action={formAction} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {state?.error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* SECTION 1: Stammdaten & Kontakt */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  1. Persönliche Daten &amp; Kontakt
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="t_name" className="flex items-center space-x-1.5 text-xs font-semibold">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Name der Lehrkraft *</span>
                    </Label>
                    <Input
                      id="t_name"
                      name="name"
                      placeholder="z. B. Dr. Markus Weber"
                      required
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t_email" className="flex items-center space-x-1.5 text-xs font-semibold">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>E-Mail (für Portal-Login)</span>
                    </Label>
                    <Input
                      id="t_email"
                      name="email"
                      type="email"
                      placeholder="dozent@sprachschule.de"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t_phone" className="flex items-center space-x-1.5 text-xs font-semibold">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Telefon / Mobil</span>
                    </Label>
                    <Input
                      id="t_phone"
                      name="phone"
                      type="tel"
                      placeholder="+49 170 1234567"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="t_birthday" className="flex items-center space-x-1.5 text-xs font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Geburtsdatum (TT.MM.JJJJ)</span>
                    </Label>
                    <GermanDatePicker
                      id="t_birthday"
                      name="birthday"
                      placeholder="TT.MM.JJJJ (z. B. 15.04.1988)"
                      mode="birthday"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Honorarsätze */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  2. Honorarsätze (Abrechnung)
                </span>

                {/* Basissatz */}
                <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="t_hourly_rate" className="flex items-center space-x-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                      <Euro className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Basissatz (€ / Std.) *</span>
                    </Label>
                    <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/60">
                      Standard
                    </span>
                  </div>
                  <Input
                    id="t_hourly_rate"
                    name="hourly_rate"
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="35.00"
                    defaultValue="35.00"
                    required
                    disabled={isPending}
                  />
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-400/80">
                    Gilt standardmäßig als Stundensatz für alle gehaltenen Unterrichtsstunden.
                  </p>
                </div>

                {/* Toggle for Advanced / Differentiated Rates */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedRates(!showAdvancedRates)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 transition-colors touch-manipulation"
                  >
                    <span>Spezifische Honorare überschreiben (Gruppen, Einzel, 45/60/90 Min.)</span>
                    {showAdvancedRates ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {showAdvancedRates && (
                    <div className="mt-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-150">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Optional: Wenn Sie für bestimmte Formate abweichende Sätze zahlen, tragen Sie diese hier ein. 
                        Nicht ausgefüllte Felder nutzen automatisch den Basissatz.
                      </p>

                      {/* Format Rates: Group & Individual */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="t_rate_group" className="flex items-center space-x-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Gruppenunterricht (€ / Std.)</span>
                          </Label>
                          <Input
                            id="t_rate_group"
                            name="rate_group"
                            type="number"
                            step="0.50"
                            min="0"
                            placeholder="z. B. 35.00"
                            disabled={isPending}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="t_rate_individual" className="flex items-center space-x-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Einzelunterricht (€ / Std.)</span>
                          </Label>
                          <Input
                            id="t_rate_individual"
                            name="rate_individual"
                            type="number"
                            step="0.50"
                            min="0"
                            placeholder="z. B. 45.00"
                            disabled={isPending}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* Duration Fixed Rates: 45, 60, 90 mins */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                          Pauschalen nach Einheitsdauer (optional):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="space-y-1">
                            <Label htmlFor="t_rate_45" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>45 Minuten (€)</span>
                            </Label>
                            <Input
                              id="t_rate_45"
                              name="rate_45"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="z. B. 25.00"
                              disabled={isPending}
                              className="text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="t_rate_60" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>60 Minuten (€)</span>
                            </Label>
                            <Input
                              id="t_rate_60"
                              name="rate_60"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="z. B. 35.00"
                              disabled={isPending}
                              className="text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="t_rate_90" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>90 Minuten (€)</span>
                            </Label>
                            <Input
                              id="t_rate_90"
                              name="rate_90"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="z. B. 50.00"
                              disabled={isPending}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 dark:border-slate-800 pb-safe">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 font-semibold">
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Lehrkraft anlegen"
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
