"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OnboardingStepKey = "teacher" | "course" | "student" | "lesson" | "billing";

interface OnboardingChecklistProps {
  organizationId: string;
  steps: Array<{ key: OnboardingStepKey; done: boolean; href: string }>;
}

/** Setup guide on the dashboard. Hides itself when everything is done or when dismissed (per browser). */
export function OnboardingChecklist({ organizationId, steps }: OnboardingChecklistProps) {
  const t = useTranslations("onboarding");
  const storageKey = `onboarding-dismissed-${organizationId}`;
  // null = not yet known (avoids a flash of the card before localStorage is read)
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed !== false || doneCount === steps.length) return null;

  const percent = Math.round((doneCount / steps.length) * 100);
  const nextKey = steps.find((s) => !s.done)?.key;

  function handleDismiss() {
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* storage unavailable: just hide for this visit */
    }
    setDismissed(true);
  }

  return (
    <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-slate-900">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Rocket strokeWidth={1.5} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t("title")}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("progress", { done: doneCount, total: steps.length })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t("dismiss")}
            title={t("dismiss")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X strokeWidth={1.5} className="w-4 h-4" />
          </button>
        </div>

        <div
          className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${percent}%` }} />
        </div>

        <ul className="space-y-2">
          {steps.map((step) => {
            const isNext = step.key === nextKey;
            return (
              <li
                key={step.key}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-3",
                  step.done
                    ? "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60"
                    : isNext
                      ? "border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                )}
              >
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  {step.done ? (
                    <CheckCircle2 strokeWidth={1.5} className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <Circle strokeWidth={1.5} className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        step.done ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-white"
                      )}
                    >
                      {t(`${step.key}Title`)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t(`${step.key}Desc`)}</p>
                  </div>
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className={cn(
                      "inline-flex items-center justify-center space-x-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors shrink-0",
                      isNext
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{t("start")}</span>
                    <ArrowRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
