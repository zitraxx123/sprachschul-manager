import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanUsage } from "@/lib/plan-limits";
import { UpgradeButton, ManageBillingButton } from "@/components/settings/billing-actions";
import { formatCurrency } from "@/lib/utils";

function Meter({ label, used, max, unlimited }: { label: string; used: number; max: number | null; unlimited: string }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const full = max !== null && used >= max;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className={`font-semibold ${full ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
          {used} / {max ?? unlimited}
        </span>
      </div>
      {max !== null && (
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className={`h-full rounded-full ${full ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export async function PlanCard({
  usage,
  billingEnabled = false,
  hasCustomer = false,
  subscriptionStatus = null,
  justSubscribed = false,
}: {
  usage: PlanUsage;
  billingEnabled?: boolean;
  hasCustomer?: boolean;
  subscriptionStatus?: string | null;
  justSubscribed?: boolean;
}) {
  const t = await getTranslations("plan");
  const atLimit =
    (usage.maxStudents !== null && usage.students >= usage.maxStudents) ||
    (usage.maxTeachers !== null && usage.teachers >= usage.maxTeachers);
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Sparkles strokeWidth={1.5} className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("title")}</h2>
          </div>
          <Badge variant="secondary" className="font-normal">{usage.planName}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Meter label={t("students")} used={usage.students} max={usage.maxStudents} unlimited={t("unlimited")} />
          <Meter label={t("teachers")} used={usage.teachers} max={usage.maxTeachers} unlimited={t("unlimited")} />
        </div>
        {justSubscribed && <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("billingSuccess")}</p>}
        {subscriptionStatus === "trialing" && <p className="text-xs text-slate-500 dark:text-slate-400">{t("statusTrialing")}</p>}
        {subscriptionStatus === "past_due" && <p className="text-xs text-red-600 dark:text-red-400">{t("statusPastDue")}</p>}
        {atLimit && <p className="text-xs text-amber-700 dark:text-amber-400">{t("limitReached")}</p>}

        {billingEnabled && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {usage.options
                .filter((p) => p.monthlyPrice > 0)
                .map((p) => (
                  <div
                    key={p.key}
                    className={`rounded-lg border p-3 space-y-2 ${p.key === usage.plan ? "border-blue-500 dark:border-blue-400" : "border-slate-200 dark:border-slate-800"}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{t("perMonth", { price: formatCurrency(p.monthlyPrice) })}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("students")}: {p.maxStudents ?? t("unlimited")} · {t("teachers")}: {p.maxTeachers ?? t("unlimited")}
                    </p>
                    {p.key === usage.plan ? (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("currentPlan")}</span>
                    ) : (
                      <UpgradeButton plan={p.key} label={hasCustomer && usage.plan !== "free" ? t("switchTo") : t("startTrial")} />
                    )}
                  </div>
                ))}
            </div>
            {hasCustomer && <ManageBillingButton />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
