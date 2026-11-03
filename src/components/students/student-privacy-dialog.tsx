"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { exportStudentData, anonymizeStudent } from "@/actions/student-privacy";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { ShieldCheck, X, Download, EyeOff, Loader2 } from "lucide-react";

interface StudentPrivacyDialogProps {
  studentId: string;
  studentName: string;
}

export function StudentPrivacyDialog({ studentId, studentName }: StudentPrivacyDialogProps) {
  const t = useTranslations("students");
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      const res = await exportStudentData(studentId);
      if (res.error || !res.json) {
        toast.error(t(res.error || "privacyErrorFailed"));
        return;
      }
      const blob = new Blob([res.json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename || "export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("privacyExported"));
    });
  };

  const handleAnonymize = () => {
    if (!confirm(t("privacyAnonymizeConfirm", { name: studentName }))) return;
    startTransition(async () => {
      const res = await anonymizeStudent(studentId);
      if (res.error) {
        toast.error(t(res.error));
        return;
      }
      toast.success(t("privacyAnonymized"));
      setIsOpen(false);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
        title={t("privacyTitle")}
      >
        <ShieldCheck strokeWidth={1.5} className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 text-left">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("privacyTitle")}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t("privacyExportHint")}</p>
              <Button type="button" variant="outline" onClick={handleExport} disabled={isPending} className="w-full justify-start">
                {isPending ? (
                  <Loader2 strokeWidth={1.5} className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download strokeWidth={1.5} className="w-4 h-4 mr-2" />
                )}
                {t("privacyExportButton")}
              </Button>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300">{t("privacyAnonymizeHint")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleAnonymize}
                disabled={isPending}
                className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <EyeOff strokeWidth={1.5} className="w-4 h-4 mr-2" />
                {t("privacyAnonymizeButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
