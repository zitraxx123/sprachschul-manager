"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Landmark, X, Loader2, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { saveSepaMandate, deleteSepaMandate, SepaActionState } from "@/actions/sepa";
import type { SepaMandateRow } from "@/types/database";

interface SepaMandateDialogProps {
  studentId: string;
  studentName: string;
  mandate: SepaMandateRow | null;
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SepaMandateDialog({ studentId, studentName, mandate }: SepaMandateDialogProps) {
  const t = useTranslations("sepa");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [holder, setHolder] = useState(mandate?.account_holder || studentName);
  const [iban, setIban] = useState(mandate?.iban || "");
  const [bic, setBic] = useState(mandate?.bic || "");
  const [ref, setRef] = useState(mandate?.mandate_ref || `M-${studentId.slice(0, 8).toUpperCase()}`);
  const [date, setDate] = useState(mandate?.mandate_date || todayLocal());
  const [sequence, setSequence] = useState<"FRST" | "RCUR">(mandate?.sequence_type || "FRST");

  function errorMessage(res: SepaActionState): string {
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "notFound":
        return t("errNotFound");
      case "invalidIban":
        return t("errIban");
      case "invalidBic":
        return t("errBic");
      case "invalidMandateRef":
        return t("errMandateRef");
      case "invalidDate":
        return t("errMandateDate");
      case "duplicateRef":
        return t("errDuplicateRef");
      case "invalid":
        return t("errInvalid");
      default:
        return t("errDb", { detail: res.detail || "" });
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSepaMandate({
        studentId,
        accountHolder: holder,
        iban,
        bic,
        mandateRef: ref,
        mandateDate: date,
        sequenceType: sequence,
      });
      if (res.success) {
        toast.success(t("saved"));
        router.refresh();
        setIsOpen(false);
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      const res = await deleteSepaMandate(studentId);
      if (res.success) {
        toast.success(t("deleted"));
        router.refresh();
        setIsOpen(false);
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  const inputClass = "h-10 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:[color-scheme:dark]";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        title={t("title")}
        aria-label={t("title")}
        className={`h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950/40 ${
          mandate ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-blue-600"
        }`}
      >
        <Landmark strokeWidth={1.5} className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/55 dark:bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:rounded-b-none sm:max-w-lg sm:max-h-[90dvh] sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{studentName}</CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label={t("close")}
                className="h-8 w-8 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X strokeWidth={1.5} className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="pt-4 overflow-y-auto">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("accountHolder")} *</Label>
                  <Input value={holder} onChange={(e) => setHolder(e.target.value)} required disabled={isPending} className={inputClass} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("iban")} *</Label>
                    <Input
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      required
                      disabled={isPending}
                      placeholder="DE89 3704 0044 0532 0130 00"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("bic")}</Label>
                    <Input value={bic} onChange={(e) => setBic(e.target.value)} disabled={isPending} className={`${inputClass} font-mono`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("mandateRef")} *</Label>
                    <Input
                      value={ref}
                      onChange={(e) => setRef(e.target.value)}
                      required
                      maxLength={35}
                      disabled={isPending}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("mandateDate")} *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={isPending} className={inputClass} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("sequence")}</Label>
                  <select
                    value={sequence}
                    onChange={(e) => setSequence(e.target.value as "FRST" | "RCUR")}
                    disabled={isPending}
                    className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:[color-scheme:dark]"
                  >
                    <option value="FRST">{t("sequenceFirst")}</option>
                    <option value="RCUR">{t("sequenceRecurring")}</option>
                  </select>
                </div>

                <div className="flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <Info strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t("mandateHint")}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {mandate ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 space-x-1.5"
                    >
                      <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                      <span>{t("delete")}</span>
                    </Button>
                  ) : (
                    <span />
                  )}
                  <div className="flex items-center space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
                      {tCommon("cancel")}
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? (
                        <>
                          <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                          {tCommon("saving")}
                        </>
                      ) : (
                        tCommon("save")
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
