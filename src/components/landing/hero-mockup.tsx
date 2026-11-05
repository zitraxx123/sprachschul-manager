"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Layers, Users, Receipt, GraduationCap } from "lucide-react";

const ROWS = [
  { time: "16:00", course: "c1", room: 1, tone: "bg-[#635BFF]" },
  { time: "17:00", course: "c3", room: 2, tone: "bg-[#00B8D9]" },
  { time: "18:00", course: "c4", room: 2, tone: "bg-[#2DD4BF]" },
] as const;

const BARS = [38, 52, 44, 68, 60, 82, 74];

const NAV = [
  { icon: LayoutDashboard, key: "dash_nav_dashboard", active: true },
  { icon: Layers, key: "dash_nav_courses", active: false },
  { icon: Users, key: "dash_nav_students", active: false },
  { icon: Receipt, key: "dash_nav_invoices", active: false },
] as const;

const STATS = [
  { v: "128", k: "dash_stat_students" },
  { v: "14", k: "dash_stat_courses" },
  { v: "92 %", k: "dash_stat_paid" },
] as const;

/** Illustrative dashboard that gently floats up and down. All figures are sample data. */
export function HeroMockup() {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();

  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -12, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      className="relative"
    >
      <div
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-[#635BFF]/30 via-[#00C2FF]/20 to-[#2DD4BF]/30 blur-2xl"
        aria-hidden
      />
      <div className="relative flex overflow-hidden rounded-2xl border border-[#E3E8EE] bg-white text-[#0A2540] shadow-[0_30px_60px_-15px_rgba(50,50,93,0.35)] dark:border-white/10 dark:bg-[#111C30] dark:text-white">
        {/* Sidebar */}
        <div className="hidden w-36 shrink-0 flex-col gap-1 border-r border-[#E3E8EE] bg-[#F6F9FC] p-3 dark:border-white/10 dark:bg-white/5 sm:flex">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#635BFF] to-[#00C2FF] text-white">
              <GraduationCap strokeWidth={1.5} className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold">Klasswerk</span>
          </div>
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.key}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium ${
                  n.active
                    ? "bg-white text-[#635BFF] shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-[#425466] dark:text-white/60"
                }`}
              >
                <Icon strokeWidth={1.5} className="h-3.5 w-3.5" />
                {t(n.key)}
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {STATS.map((s) => (
              <div key={s.k} className="rounded-lg border border-[#E3E8EE] p-2.5 dark:border-white/10">
                <div className="text-lg font-bold leading-none sm:text-xl">{s.v}</div>
                <div className="mt-1 truncate text-[10px] text-[#425466] dark:text-white/60 sm:text-[11px]">{t(s.k)}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[#E3E8EE] p-3 dark:border-white/10">
            <div className="mb-2 text-[11px] font-semibold text-[#425466] dark:text-white/70">{t("dash_attendance")}</div>
            <div className="flex h-16 items-end gap-1.5">
              {BARS.map((h, i) => (
                <motion.div
                  key={i}
                  initial={reduce ? false : { height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.07, ease: "easeOut" }}
                  className="flex-1 rounded-t bg-gradient-to-t from-[#635BFF] to-[#00C2FF]"
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold text-[#425466] dark:text-white/70">{t("dash_today")}</div>
            <ul className="space-y-1.5">
              {ROWS.map((r) => (
                <li
                  key={r.time}
                  className="flex items-center gap-3 rounded-lg border border-[#E3E8EE] px-3 py-2 text-xs dark:border-white/10"
                >
                  <span className={`h-6 w-1 rounded-full ${r.tone}`} />
                  <span className="font-bold tabular-nums">{r.time}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{t(`mock_courses_${r.course}`)}</span>
                  <span className="text-[#425466] dark:text-white/60">{t("mock_room", { n: r.room })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
