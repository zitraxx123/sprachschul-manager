"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { generateInvoicesForMonth, InvoiceActionState } from "@/actions/invoices";

interface InvoiceGeneratorProps {
  month: string; // YYYY-MM
  billingComplete: boolean;
}

export function InvoiceGenerator({ month, billingComplete }: InvoiceGeneratorProps) {
  const t = useTranslations("invoices");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(month);

  function errorMessage(res: InvoiceActionState): string {
    const detail = res.detail || "";
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "invalid":
        return t("errInvalid");
      case "notFound":
        return t("errNotFound");
      case "billingIncomplete":
        return t("errBillingIncomplete");
      case "invalidTransition":
        return t("errInvalidTransition");
      default:
        return t("errDb", { detail });
    }
  }

  function handleMonthChange(value: string) {
    setSelected(value);
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      router.push(`/invoices?month=${value}`);
    }
  }

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateInvoicesForMonth(selected);
      if (res.success) {
        toast.success(t("generatedResult", { created: res.created ?? 0, skipped: res.skipped ?? 0 }));
        if (res.failed) toast.error(t("generatedPartial", { failed: res.failed }));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="invoice-month" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("month")}
          </Label>
          <Input
            id="invoice-month"
            type="month"
            value={selected}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="h-10 text-sm w-full sm:w-48 bg-white dark:bg-slate-900 text-slate-900 dark:text-white dark:[color-scheme:dark]"
          />
        </div>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={isPending || !billingComplete || selected !== month}
          className="h-10 bg-blue-600 hover:bg-blue-700 text-white space-x-2 w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" />
              <span>{t("generating")}</span>
            </>
          ) : (
            <>
              <FilePlus2 strokeWidth={1.5} className="w-4 h-4" />
              <span>{t("generate")}</span>
            </>
          )}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("generateHint")}</p>
    </div>
  );
}
