"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Landmark, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { exportSepaDirectDebit, SepaActionState } from "@/actions/sepa";
import { formatCurrency } from "@/lib/utils";

interface SepaExportProps {
  month: string;
  eligible: number;
  missing: number;
  creditorReady: boolean;
  defaultDate: string;
}

export function SepaExport({ month, eligible, missing, creditorReady, defaultDate }: SepaExportProps) {
  const t = useTranslations("sepa");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [markRecurring, setMarkRecurring] = useState(true);

  function errorMessage(res: SepaActionState): string {
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "creditorIncomplete":
        return t("errCreditor");
      case "invalidDate":
        return t("errCollectionDate");
      case "nothingToExport":
        return t("errNothing");
      case "invalid":
        return t("errInvalid");
      default:
        return t("errDb", { detail: res.detail || "" });
    }
  }

  function handleExport() {
    startTransition(async () => {
      const res = await exportSepaDirectDebit({ monthYear: month, collectionDate: date, markRecurring });
      if (res.success && res.xml) {
        const blob = new Blob([res.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename || "lastschrift.xml";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success(t("exported", { count: res.count ?? 0, total: formatCurrency(res.total ?? 0) }));
        if (res.skipped) toast.info(t("skipped", { count: res.skipped }));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Landmark strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("exportTitle")}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("exportDesc")}</p>
          </div>
        </div>

        {!creditorReady && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-start space-x-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {t("creditorMissing")}{" "}
              <Link href="/settings" className="underline font-semibold">
                {t("goToSettings")}
              </Link>
            </span>
          </div>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t("eligibleSummary", { eligible, missing })}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="sepa-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("collectionDate")}
            </Label>
            <Input
              id="sepa-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 text-sm w-full sm:w-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:[color-scheme:dark]"
            />
          </div>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isPending || !creditorReady || eligible === 0 || !date}
            className="h-10 bg-blue-600 hover:bg-blue-700 text-white space-x-2 w-full sm:w-auto"
          >
            {isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <Download strokeWidth={1.5} className="w-4 h-4" />}
            <span>{t("download")}</span>
          </Button>
        </div>

        <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={markRecurring}
            onChange={(e) => setMarkRecurring(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 bg-white dark:bg-slate-800"
          />
          <span>{t("markRecurring")}</span>
        </label>
      </CardContent>
    </Card>
  );
}
