"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Eye, CheckCircle2, Undo2, Ban, Loader2, BellRing } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { setInvoiceStatus, InvoiceActionState } from "@/actions/invoices";

interface InvoiceRowActionsProps {
  invoiceId: string;
  status: "open" | "paid" | "cancelled";
  overdue?: boolean;
}

export function InvoiceRowActions({ invoiceId, status, overdue = false }: InvoiceRowActionsProps) {
  const t = useTranslations("invoices");
  const tReminder = useTranslations("reminder");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function errorMessage(res: InvoiceActionState): string {
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
        return t("errDb", { detail: res.detail || "" });
    }
  }

  function change(next: "open" | "paid" | "cancelled") {
    if (next === "cancelled" && !window.confirm(t("cancelConfirm"))) return;
    startTransition(async () => {
      const res = await setInvoiceStatus(invoiceId, next);
      if (res.success) {
        toast.success(t("statusUpdated"));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  const btn = "h-8 px-2.5 text-xs space-x-1.5 dark:border-slate-700 dark:text-slate-200";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/invoices/${invoiceId}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), btn)}
      >
        <Eye strokeWidth={1.5} className="w-4 h-4" />
        <span>{t("view")}</span>
      </Link>

      {status === "open" && overdue && (

        <Link href={`/invoices/${invoiceId}/reminder`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), btn, "text-amber-700 dark:text-amber-400")}>

          <BellRing strokeWidth={1.5} className="w-4 h-4" />

          <span>{tReminder("button")}</span>

        </Link>

      )}


      {status === "open" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => change("paid")}
          className={`${btn} text-emerald-700 dark:text-emerald-400`}
        >
          {isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <CheckCircle2 strokeWidth={1.5} className="w-4 h-4" />}
          <span>{t("markPaid")}</span>
        </Button>
      )}

      {status === "paid" && (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => change("open")} className={btn}>
          {isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <Undo2 strokeWidth={1.5} className="w-4 h-4" />}
          <span>{t("markOpen")}</span>
        </Button>
      )}

      {status === "open" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => change("cancelled")}
          className="h-8 px-2.5 text-xs space-x-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <Ban strokeWidth={1.5} className="w-4 h-4" />
          <span>{t("cancel")}</span>
        </Button>
      )}
    </div>
  );
}
