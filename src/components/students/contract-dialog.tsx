"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FileSignature, X, Loader2, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { updateEnrollmentContract, ContractActionState } from "@/actions/contracts";
import { computeContractEnd, contractState, ContractState } from "@/lib/contracts";
import { formatDate } from "@/lib/utils";

export interface ContractEnrollment {
  courseId: string;
  courseName: string;
  contractStart: string | null;
  contractEnd: string | null;
  noticePeriodWeeks: number;
  cancelledOn: string | null;
}

interface ContractDialogProps {
  studentId: string;
  studentName: string;
  enrollments: ContractEnrollment[];
}

const STATE_VARIANT: Record<ContractState, "secondary" | "default" | "success" | "warning"> = {
  none: "secondary",
  upcoming: "default",
  active: "success",
  cancelled: "warning",
  ended: "secondary",
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EnrollmentForm({ studentId, enrollment }: { studentId: string; enrollment: ContractEnrollment }) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [start, setStart] = useState(enrollment.contractStart || "");
  const [end, setEnd] = useState(enrollment.contractEnd || "");
  const [weeks, setWeeks] = useState(String(enrollment.noticePeriodWeeks ?? 4));
  const [cancelledOn, setCancelledOn] = useState(enrollment.cancelledOn || "");

  const state = contractState(
    { contractStart: start || null, contractEnd: end || null, cancelledOn: cancelledOn || null },
    todayLocal()
  );

  function errorMessage(res: ContractActionState): string {
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "notFound":
        return t("errNotFound");
      case "invalid":
        return t("errInvalid");
      case "dates":
        return t("errDates");
      default:
        return t("errDb", { detail: res.detail || "" });
    }
  }

  function handleCalculate() {
    const n = parseInt(weeks, 10);
    if (!cancelledOn || isNaN(n)) {
      toast.error(t("calcNeedsDate"));
      return;
    }
    setEnd(computeContractEnd(cancelledOn, n));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateEnrollmentContract({
        studentId,
        courseId: enrollment.courseId,
        contractStart: start || null,
        contractEnd: end || null,
        noticePeriodWeeks: parseInt(weeks, 10),
        cancelledOn: cancelledOn || null,
      });
      if (res.success) {
        toast.success(t("saved"));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  const inputClass = "h-9 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:[color-scheme:dark]";

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 p-3 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{enrollment.courseName}</p>
        <Badge variant={STATE_VARIANT[state]}>
          {state === "cancelled" && end
            ? t("stateCancelled", { date: formatDate(end, locale) })
            : t(`state_${state}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("start")}</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} disabled={isPending} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("end")}</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} disabled={isPending} className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("notice")}</Label>
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="52"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              disabled={isPending}
              className={`${inputClass} pr-16`}
            />
            <span className="absolute right-3 top-2 text-xs text-slate-400 dark:text-slate-500">{t("weeks")}</span>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-700 dark:text-slate-300">{t("cancelledOn")}</Label>
          <Input type="date" value={cancelledOn} onChange={(e) => setCancelledOn(e.target.value)} disabled={isPending} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCalculate}
          disabled={isPending}
          className="h-8 text-xs space-x-1.5 dark:border-slate-700 dark:text-slate-200"
        >
          <Calculator strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("calcEnd")}</span>
        </Button>
        <Button type="submit" size="sm" disabled={isPending} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
          {isPending ? (
            <>
              <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-1.5 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            tCommon("save")
          )}
        </Button>
      </div>
    </form>
  );
}

export function ContractDialog({ studentId, studentName, enrollments }: ContractDialogProps) {
  const t = useTranslations("contracts");
  const [isOpen, setIsOpen] = useState(false);

  const today = todayLocal();
  const hasCancellation = enrollments.some(
    (e) => contractState({ contractStart: e.contractStart, contractEnd: e.contractEnd, cancelledOn: e.cancelledOn }, today) === "cancelled"
  );

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
          hasCancellation ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400 hover:text-blue-600"
        }`}
      >
        <FileSignature strokeWidth={1.5} className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1220]/55 dark:bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:rounded-b-none sm:max-w-xl sm:max-h-[90dvh] sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in max-sm:slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("title")}</CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("subtitle", { name: studentName })}
                </CardDescription>
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
            <CardContent className="pt-4 space-y-3 overflow-y-auto">
              {enrollments.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">{t("empty")}</p>
              ) : (
                enrollments.map((e) => <EnrollmentForm key={e.courseId} studentId={studentId} enrollment={e} />)
              )}
              <div className="flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <Info strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t("hint")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
