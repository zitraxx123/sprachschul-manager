"use client";

import { useState } from "react";
import { useActionState } from "react";
import { recordMonthlyPayment, MonthlyPaymentActionState } from "@/actions/monthly-payments";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, X, Euro, Calendar, Loader2, AlertCircle } from "lucide-react";

interface RecordPaymentDialogProps {
  studentId: string;
  studentName: string;
  currentMonthYear?: string;
  defaultAmount?: number;
  isAlreadyPaid?: boolean;
}

export function RecordPaymentDialog({
  studentId,
  studentName,
  currentMonthYear,
  defaultAmount = 120,
  isAlreadyPaid = false,
}: RecordPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const now = new Date();
  const defaultMonth = currentMonthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [state, formAction, isPending] = useActionState<MonthlyPaymentActionState | null, FormData>(
    async (prev, formData) => {
      const res = await recordMonthlyPayment(prev, formData);
      if (res?.success) {
        toast.success("Zahlungsstatus erfolgreich gespeichert!");
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
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`h-8 px-2.5 text-xs font-medium shadow-xs ${
          isAlreadyPaid 
            ? "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700" 
            : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border-blue-200 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/30"
        }`}
      >
        <CreditCard className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
        <span>Zahlung erfassen</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-3xl max-sm:rounded-b-none sm:max-w-md sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">Monatsbeitrag erfassen</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Monatsabo-Zahlung für <strong>{studentName}</strong> dokumentieren
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {state?.error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 flex items-start space-x-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{state.error}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <input type="hidden" name="student_id" value={studentId} />

                {/* Month Year */}
                <div className="space-y-1.5">
                  <Label htmlFor="month_year" className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Abrechnungsmonat (YYYY-MM) *</span>
                  </Label>
                  <Input
                    id="month_year"
                    name="month_year"
                    type="month"
                    defaultValue={defaultMonth}
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Amount in Euro */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount_euro" className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                    <Euro className="w-3.5 h-3.5 text-slate-400" />
                    <span>Monatsbeitrag in € *</span>
                  </Label>
                  <Input
                    id="amount_euro"
                    name="amount_euro"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="120.00"
                    defaultValue={defaultAmount.toFixed(2)}
                    required
                    disabled={isPending}
                  />
                </div>

                {/* Paid Status Toggle */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_paid"
                    name="is_paid"
                    defaultChecked={true}
                    disabled={isPending}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-700 focus:ring-blue-500 bg-white dark:bg-slate-800"
                  />
                  <Label htmlFor="is_paid" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Als bezahlt markieren (Zahlungseingang bestätigt)
                  </Label>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                      "Zahlung speichern"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
