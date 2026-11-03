"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface MinijobMeterProps {
  earnings: number;
  limit: number;
  className?: string;
}

/** Progress towards the monthly Minijob earnings limit; warns from 80 %, alarms above 100 %. */
export function MinijobMeter({ earnings, limit, className }: MinijobMeterProps) {
  const t = useTranslations("teachers");
  if (!(limit > 0)) return null;

  const ratio = earnings / limit;
  const percent = Math.min(100, Math.round(ratio * 100));
  const over = ratio > 1;
  const near = !over && ratio >= 0.8;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            over ? "bg-red-500" : near ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={cn(
          "text-[11px] font-medium flex items-center gap-1 justify-end text-right",
          over
            ? "text-red-600 dark:text-red-400"
            : near
              ? "text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
        )}
      >
        {(over || near) && <AlertTriangle strokeWidth={1.5} className="w-3 h-3 shrink-0" />}
        <span>
          {over
            ? t("minijobOver", { limit: formatCurrency(limit) })
            : near
              ? t("minijobNear", { amount: formatCurrency(earnings), limit: formatCurrency(limit) })
              : t("minijobOf", { amount: formatCurrency(earnings), limit: formatCurrency(limit) })}
        </span>
      </p>
    </div>
  );
}
