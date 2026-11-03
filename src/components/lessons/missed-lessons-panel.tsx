"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCheck, ClipboardCheck, Loader2, Info, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { recordMissedLessons, MissedLessonsState } from "@/actions/missed-lessons";
import { formatDate } from "@/lib/utils";

export interface MissedLessonItem {
  key: string;
  courseName: string;
  date: string;
  startTime: string;
  duration: number;
  teacherName: string;
  isSubstituted: boolean;
  isMoved: boolean;
}

export function MissedLessonsPanel({ items }: { items: MissedLessonItem[] }) {
  const t = useTranslations("missedLessons");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.key)));

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.key)));
  }

  function errorMessage(res: MissedLessonsState): string {
    switch (res.errorCode) {
      case "forbidden":
        return t("errForbidden");
      case "nothing":
        return t("errNothing");
      case "invalid":
      case "notFound":
        return t("errInvalid");
      default:
        return t("errDb", { detail: res.detail || "" });
    }
  }

  function submit(outcome: "completed" | "cancelled") {
    const keys = items.filter((i) => selected.has(i.key)).map((i) => ({ key: i.key }));
    if (keys.length === 0) {
      toast.error(t("noneSelected"));
      return;
    }
    startTransition(async () => {
      const res = await recordMissedLessons(keys, outcome);
      if (res.success) {
        toast.success(t("recorded", { count: res.recorded ?? 0 }));
        if (res.skipped) toast.info(t("skipped", { count: res.skipped }));
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  }

  return (
    <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-slate-900">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ClipboardCheck strokeWidth={1.5} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t("title", { count: items.length })}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("subtitle")}</p>
          </div>
        </div>

        <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 bg-white dark:bg-slate-800"
          />
          <span>{t("selectAll", { selected: selected.size, total: items.length })}</span>
        </label>

        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {items.map((item) => (
            <li key={item.key}>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.has(item.key)}
                  onChange={() => toggle(item.key)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 bg-white dark:bg-slate-800 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.courseName}</span>
                    {item.isSubstituted && (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                        {t("substitute")}
                      </Badge>
                    )}
                    {item.isMoved && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        {t("moved")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(item.date, locale)} · {item.startTime} · {item.duration} h · {item.teacherName}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={() => submit("completed")}
            disabled={isPending || selected.size === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white space-x-2 w-full sm:w-auto"
          >
            {isPending ? <Loader2 strokeWidth={1.5} className="w-4 h-4 animate-spin" /> : <CheckCheck strokeWidth={1.5} className="w-4 h-4" />}
            <span>{t("recordCompleted")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => submit("cancelled")}
            disabled={isPending || selected.size === 0}
            className="space-x-2 w-full sm:w-auto dark:border-slate-700 dark:text-slate-200"
          >
            <XCircle strokeWidth={1.5} className="w-4 h-4" />
            <span>{t("recordCancelled")}</span>
          </Button>
        </div>

        <div className="flex items-start space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Info strokeWidth={1.5} className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{t("hint")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
