"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("teachers");
  const tCommon = useTranslations("common");

  const [isOpen, setIsOpen] = useState(false);
  const [showAdvancedRates, setShowAdvancedRates] = useState(false);

  const [state, formAction, isPending] = useActionState<TeacherActionState | null, FormData>(
    async (prev, formData) => {
      const res = await createTeacher(prev, formData);
      if (res?.success) {
        toast.success(t("addTeacher") + " " + tCommon("saved"));
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
      <Button onClick={() => setIsOpen(true)} className="space-x-2 shadow-sm">
        <Plus strokeWidth={1.5} className="w-4 h-4" />
        <span>{t("addTeacher")}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-xl max-sm:rounded-b-none sm:max-w-2xl sm:rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Modal Header */}
            <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-start justify-between shrink-0 border-b border-slate-800">
              <div>
                <span className="text-[11px] text-blue-400 font-semibold uppercase tracking-wider">
                  {tCommon("teacherPortal")}
                </span>
                <h3 className="text-xl font-bold mt-0.5 text-white">{t("addTeacher")}</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {t("subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-slate-400 hover:text-white p-2 rounded-xl transition-all active:scale-95 touch-manipulation"
                aria-label={tCommon("close")}
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form action={formAction} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {state?.error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              {/* SECTION 1: Stammdaten & Kontakt */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  1. {t("name")} &amp; {tCommon("details")}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="t_name" className="flex items-center space-x-2 text-xs font-semibold">
                      <User strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                      <span>{t("name")} *</span>
                    </Label>
                    <Input
                      id="t_name"
                      name="name"
                      placeholder="Dr. Markus Weber"
                      required
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="t_email" className="flex items-center space-x-2 text-xs font-semibold">
                      <Mail strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                      <span>{tCommon("email")}</span>
                    </Label>
                    <Input
                      id="t_email"
                      name="email"
                      type="email"
                      placeholder="dozent@sprachschule.de"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="t_phone" className="flex items-center space-x-2 text-xs font-semibold">
                      <Phone strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                      <span>{tCommon("phone")}</span>
                    </Label>
                    <Input
                      id="t_phone"
                      name="phone"
                      type="tel"
                      placeholder="+49 170 1234567"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="t_birthday" className="flex items-center space-x-2 text-xs font-semibold">
                      <Calendar strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                      <span>{t("birthday")}</span>
                    </Label>
                    <GermanDatePicker
                      id="t_birthday"
                      name="birthday"
                      placeholder="15.04.1988"
                      mode="birthday"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Honorarsätze */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  2. {t("hourlyRate")}
                </span>

                {/* Basissatz */}
                <div className="bg-blue-50/60 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="t_hourly_rate" className="flex items-center space-x-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                      <Euro strokeWidth={1.5} className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{t("baseRate")} *</span>
                    </Label>
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
                    {t("baseRateDesc")}
                  </p>
                </div>

                {/* Toggle for Advanced / Differentiated Rates */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedRates(!showAdvancedRates)}
                    className="flex items-center space-x-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 py-1 transition-colors touch-manipulation"
                  >
                    <span>{t("advancedRatesToggle")}</span>
                    {showAdvancedRates ? (
                      <ChevronUp strokeWidth={1.5} className="w-4 h-4" />
                    ) : (
                      <ChevronDown strokeWidth={1.5} className="w-4 h-4" />
                    )}
                  </button>

                  {showAdvancedRates && (
                    <div className="mt-3 p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-4 animate-in fade-in duration-150">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("advancedRatesDesc")}
                      </p>

                      {/* Format Rates: Group & Individual */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="t_rate_group" className="flex items-center space-x-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <Users strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                            <span>{t("groupRate")}</span>
                          </Label>
                          <Input
                            id="t_rate_group"
                            name="rate_group"
                            type="number"
                            step="0.50"
                            min="0"
                            placeholder="35.00"
                            disabled={isPending}
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="t_rate_individual" className="flex items-center space-x-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <UserCheck strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                            <span>{t("individualRate")}</span>
                          </Label>
                          <Input
                            id="t_rate_individual"
                            name="rate_individual"
                            type="number"
                            step="0.50"
                            min="0"
                            placeholder="45.00"
                            disabled={isPending}
                            className="text-xs"
                          />
                        </div>
                      </div>

                      {/* Duration Fixed Rates: 45, 60, 90 mins */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="t_rate_45" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                              <span>{t("rate45")}</span>
                            </Label>
                            <Input
                              id="t_rate_45"
                              name="rate_45"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="25.00"
                              disabled={isPending}
                              className="text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="t_rate_60" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                              <span>{t("rate60")}</span>
                            </Label>
                            <Input
                              id="t_rate_60"
                              name="rate_60"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="35.00"
                              disabled={isPending}
                              className="text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="t_rate_90" className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400">
                              <Clock strokeWidth={1.5} className="w-4 h-4 text-slate-400" />
                              <span>{t("rate90")}</span>
                            </Label>
                            <Input
                              id="t_rate_90"
                              name="rate_90"
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="50.00"
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
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 font-semibold">
                  {isPending ? (
                    <>
                      <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                      {tCommon("saving")}
                    </>
                  ) : (
                    t("addTeacher")
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
