"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Calculator,
  DoorOpen,
  Layers,
  LayoutDashboard,
  Lock,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const CARDS: Array<{ id: "c1" | "c2" | "c3" | "c4"; icon: Icon; pos: string; delay: number }> = [
  { id: "c1", icon: Calculator, pos: "lg:left-[4%] lg:top-[16%]", delay: 0 },
  { id: "c2", icon: Smartphone, pos: "lg:left-[6%] lg:bottom-[12%]", delay: 0.9 },
  { id: "c3", icon: DoorOpen, pos: "lg:right-[4%] lg:top-[12%]", delay: 0.45 },
  { id: "c4", icon: ShieldCheck, pos: "lg:right-[6%] lg:bottom-[16%]", delay: 1.3 },
];

const SIDE = [LayoutDashboard, Layers, Users, Receipt, DoorOpen, Settings];
const ROWS = [
  { time: "16:00", course: "c1", room: 1, tone: "bg-[#635BFF]" },
  { time: "17:00", course: "c3", room: 2, tone: "bg-[#FF6AA2]" },
  { time: "18:00", course: "c4", room: 2, tone: "bg-[#FFA13D]" },
] as const;
const BARS = [40, 55, 48, 70, 62, 84];

/** Browser-style window with a sidebar, the week's schedule and a finance panel. Sample data only. */
function AppMockup() {
  const t = useTranslations("landing");
  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_40px_80px_-20px_rgba(60,20,100,0.55)] dark:border-white/10 dark:bg-[#111C30]">
      {/* Browser frame */}
      <div className="flex items-center gap-3 border-b border-[#E3E8EE] bg-[#F6F9FC] px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-[#425466] shadow-sm dark:bg-white/10 dark:text-white/70">
          <Lock strokeWidth={1.5} className="h-3 w-3" />
          Klasswerk
        </div>
        <span className="w-10" aria-hidden />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-2 border-r border-[#E3E8EE] bg-[#F6F9FC] py-3 dark:border-white/10 dark:bg-white/5 sm:flex" aria-hidden>
          {SIDE.map((Icon, i) => (
            <span
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                i === 0 ? "bg-gradient-to-br from-[#635BFF] to-[#B57BFF] text-white" : "text-[#8795A8] dark:text-white/50"
              }`}
            >
              <Icon strokeWidth={1.5} className="h-4 w-4" />
            </span>
          ))}
        </div>

        {/* Screen */}
        <div className="grid min-w-0 flex-1 gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <div className="rounded-xl border border-[#E3E8EE] p-3 dark:border-white/10">
            <div className="mb-2 text-xs font-bold text-[#0A2540] dark:text-white">{t("hl_mock_schedule")}</div>
            <ul className="space-y-1.5">
              {ROWS.map((r) => (
                <li key={r.time} className="flex items-center gap-2.5 rounded-lg bg-[#F6F9FC] px-2.5 py-2 text-[11px] dark:bg-white/5">
                  <span className={`h-6 w-1 rounded-full ${r.tone}`} />
                  <span className="font-bold tabular-nums text-[#0A2540] dark:text-white">{r.time}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[#0A2540] dark:text-white/90">{t(`mock_courses_${r.course}`)}</span>
                  <span className="text-[#425466] dark:text-white/60">{t("mock_room", { n: r.room })}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#E3E8EE] p-3 dark:border-white/10">
            <div className="mb-1 text-xs font-bold text-[#0A2540] dark:text-white">{t("hl_mock_finance")}</div>
            <div className="text-2xl font-extrabold leading-none text-[#0A2540] dark:text-white">4.280 €</div>
            <div className="mt-0.5 text-[11px] text-[#425466] dark:text-white/60">{t("hl_mock_revenue")}</div>
            <div className="mt-3 flex h-14 items-end gap-1.5" aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#FF6AA2] to-[#FFA13D]" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-3 flex gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{t("dash_stat_paid")} 92 %</span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{t("hl_mock_open")} 8 %</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({ card, index }: { card: (typeof CARDS)[number]; index: number }) {
  const t = useTranslations("landing");
  const Icon = card.icon;
  const floatVars = {
    "--float-amp": "-15px",
    "--float-dur": `${5 + index * 0.6}s`,
    "--float-delay": `${card.delay}s`,
  } as React.CSSProperties;

  return (
    <div className={`${card.pos} lg:absolute lg:z-10 lg:w-64`}>
      <div style={floatVars} className="animate-float will-change-transform motion-reduce:animate-none">
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="rounded-2xl bg-white p-5 shadow-xl shadow-[#3C1464]/20 transition-shadow duration-300 hover:shadow-2xl dark:bg-[#16233A] dark:shadow-black/40"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#635BFF] to-[#FF6AA2] text-white">
            <Icon strokeWidth={1.5} className="h-5 w-5" />
          </span>
          <div className="mt-3 text-base font-extrabold leading-snug text-[#0A2540] dark:text-white">{t(`hl_${card.id}_t`)}</div>
          <p className="mt-1 text-sm leading-relaxed text-[#425466] dark:text-white/70">{t(`hl_${card.id}_d`)}</p>
        </motion.div>
      </div>
    </div>
  );
}

/** Bright gradient stage with a floating app window and four floating feature cards (stacked below it on phones). */
export function HighlightsStage() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#FF7EB3] via-[#B57BFF] to-[#FFB347] px-4 py-10 dark:from-[#7A2A5C] dark:via-[#3E2A7A] dark:to-[#8A4B12] sm:px-8 lg:min-h-[680px] lg:px-0 lg:py-0">
      {/* Blurred colour blobs: pink, violet, orange, yellow (static, so the blur is painted only once) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-[#FF4D94]/60 blur-3xl" />
        <div className="absolute -right-16 top-0 h-80 w-80 rounded-full bg-[#8B5CFF]/60 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-[#FF9A3D]/70 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-72 w-72 rounded-full bg-[#FFE066]/70 blur-3xl" />
      </div>

      <div className="relative lg:flex lg:min-h-[680px] lg:items-center lg:justify-center">
        <div
          style={{ "--float-amp": "-8px", "--float-dur": "7s" } as React.CSSProperties}
          className="mx-auto w-full max-w-3xl animate-float will-change-transform motion-reduce:animate-none lg:w-[62%] lg:max-w-none"
        >
          <AppMockup />
        </div>

        {/* Cards: absolutely placed around the window on large screens, a column / two columns below it on phones */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:contents">
          {CARDS.map((c, i) => (
            <FloatingCard key={c.id} card={c} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
