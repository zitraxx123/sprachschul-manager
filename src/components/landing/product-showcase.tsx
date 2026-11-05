"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Banknote,
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Hourglass,
  Landmark,
  Lightbulb,
  Receipt,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  X,
  ArrowUpRight,
} from "lucide-react";

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;
type Feature = { key: string; icon: Icon };
type CardDef = { id: "c1" | "c2" | "c3"; group: "g1" | "g2" | "g3"; icon: Icon; gradient: string; features: Feature[] };

const CARDS: CardDef[] = [
  {
    id: "c1",
    group: "g1",
    icon: CalendarDays,
    gradient: "from-[#635BFF] to-[#4F7CFF]",
    features: [
      { key: "schedule", icon: CalendarDays },
      { key: "attendance", icon: ClipboardCheck },
      { key: "shifts", icon: CalendarClock },
      { key: "waitlist", icon: Hourglass },
    ],
  },
  {
    id: "c2",
    group: "g2",
    icon: Banknote,
    gradient: "from-[#0099CC] to-[#2DD4BF]",
    features: [
      { key: "plans", icon: Banknote },
      { key: "invoices", icon: Receipt },
      { key: "sepa", icon: Landmark },
      { key: "payroll", icon: Wallet },
      { key: "export", icon: FileSpreadsheet },
    ],
  },
  {
    id: "c3",
    group: "g3",
    icon: Users,
    gradient: "from-[#8B5CF6] to-[#635BFF]",
    features: [
      { key: "portal", icon: GraduationCap },
      { key: "assistant", icon: UserCog },
      { key: "privacy", icon: ShieldCheck },
    ],
  },
];

const RADIUS = { borderRadius: 28 };

/** Card with a 3D tilt that follows the mouse. The tilt wrapper and the shared-layout surface are separate elements. */
function ShowcaseCard({ card, onOpen }: { card: CardDef; onOpen: () => void }) {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const Icon = card.icon;

  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div style={{ perspective: 1000 }} className="h-full">
      <motion.div
        style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          ry.set(((e.clientX - r.left) / r.width - 0.5) * 14);
          rx.set(-((e.clientY - r.top) / r.height - 0.5) * 14);
        }}
        onPointerLeave={reset}
        className="h-full"
      >
        <motion.div
          layoutId={`card-${card.id}`}
          style={RADIUS}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          onClick={() => {
            reset();
            onOpen();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              reset();
              onOpen();
            }
          }}
          className="group relative flex h-full cursor-pointer flex-col overflow-hidden border border-[#E3E8EE] bg-white p-7 shadow-[0_20px_50px_-20px_rgba(50,50,93,0.3)] transition-shadow duration-300 hover:shadow-[0_30px_70px_-20px_rgba(99,91,255,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#635BFF] dark:border-white/10 dark:bg-[#111C30]"
        >
          <div aria-hidden className={`pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br ${card.gradient} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`} />
          <motion.span layoutId={`icon-${card.id}`} className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
            <Icon strokeWidth={1.5} className="h-7 w-7" />
          </motion.span>
          <h3 className="relative mt-6 text-2xl font-extrabold tracking-tight text-[#0A2540] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
            {t(`showcase_${card.id}_title`)}
          </h3>
          <p className="relative mt-2 text-[15px] leading-relaxed text-[#425466] dark:text-white/70">{t(`showcase_${card.id}_desc`)}</p>
          <ul className="relative mt-6 flex flex-wrap gap-2">
            {card.features.map((f) => {
              const FIcon = f.icon;
              return (
                <li key={f.key} className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F9FC] px-3 py-1.5 text-xs font-medium text-[#0A2540] dark:bg-white/10 dark:text-white/85">
                  <FIcon strokeWidth={1.5} className="h-3.5 w-3.5 text-[#635BFF] dark:text-[#B4AFFF]" />
                  {t(`features_${card.group}_items_${f.key}_t`)}
                </li>
              );
            })}
          </ul>
          <span className="relative mt-auto inline-flex items-center gap-1 pt-7 text-sm font-semibold text-[#635BFF] dark:text-[#B4AFFF]">
            {t("showcase_more")}
            <ArrowUpRight strokeWidth={2} className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Full-screen view: an app-like panel with the feature list on the left and details on the right. */
function ExpandedCard({ card, onClose }: { card: CardDef; onClose: () => void }) {
  const t = useTranslations("landing");
  const [selected, setSelected] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const Icon = card.icon;
  const active = card.features[selected];
  const ActiveIcon = active.icon;

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center p-2 sm:p-8">
      <motion.div
        layoutId={`card-${card.id}`}
        style={RADIUS}
        role="dialog"
        aria-modal="true"
        aria-label={t(`showcase_${card.id}_title`)}
        className="relative flex w-full max-w-6xl flex-col overflow-hidden border border-[#E3E8EE] bg-white shadow-2xl dark:border-white/10 dark:bg-[#0F1A2E]"
      >
        <div className={`relative flex items-center gap-4 bg-gradient-to-r ${card.gradient} px-5 py-5 text-white sm:px-8`}>
          <motion.span layoutId={`icon-${card.id}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Icon strokeWidth={1.5} className="h-6 w-6" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-xl font-extrabold sm:text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
              {t(`showcase_${card.id}_title`)}
            </h3>
            <p className="hidden truncate text-sm text-white/85 sm:block">{t(`showcase_${card.id}_desc`)}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("showcase_close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <X strokeWidth={2} className="h-5 w-5" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[300px_1fr] md:overflow-hidden"
        >
          <ul className="space-y-1.5 border-b border-[#E3E8EE] bg-[#F6F9FC] p-3 dark:border-white/10 dark:bg-white/5 md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
            {card.features.map((f, i) => {
              const FIcon = f.icon;
              const on = i === selected;
              return (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-current={on}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#635BFF] ${
                      on
                        ? "bg-white text-[#0A2540] shadow-md dark:bg-white/15 dark:text-white"
                        : "text-[#425466] hover:bg-white/70 dark:text-white/65 dark:hover:bg-white/10"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? `bg-gradient-to-br ${card.gradient} text-white` : "bg-white text-[#635BFF] dark:bg-white/10 dark:text-[#B4AFFF]"}`}>
                      <FIcon strokeWidth={1.5} className="h-[18px] w-[18px]" />
                    </span>
                    {t(`features_${card.group}_items_${f.key}_t`)}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="p-6 sm:p-10 md:overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.key}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
                  <ActiveIcon strokeWidth={1.5} className="h-8 w-8" />
                </span>
                <h4 className="mt-6 text-2xl font-extrabold tracking-tight text-[#0A2540] dark:text-white sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                  {t(`features_${card.group}_items_${active.key}_t`)}
                </h4>
                <p className="mt-3 max-w-xl text-lg leading-relaxed text-[#425466] dark:text-white/75">
                  {t(`features_${card.group}_items_${active.key}_d`)}
                </p>

                <h5 className="mt-8 text-sm font-bold text-[#0A2540] dark:text-white">{t("showcase_do")}</h5>
                <ul className="mt-3 max-w-2xl space-y-2.5">
                  {(["b1", "b2", "b3"] as const).map((b, i) => (
                    <motion.li
                      key={b}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 + i * 0.07, duration: 0.3 }}
                      className="flex items-start gap-3 rounded-xl border border-[#E3E8EE] bg-[#F6F9FC] px-4 py-3 text-[15px] leading-relaxed text-[#0A2540] dark:border-white/10 dark:bg-white/5 dark:text-white/90"
                    >
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${card.gradient} text-white`}>
                        <Check strokeWidth={2.5} className="h-3.5 w-3.5" />
                      </span>
                      <span>{t(`fd_${active.key}_${b}`)}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-dashed border-[#635BFF]/40 bg-[#635BFF]/5 px-4 py-3.5 text-[15px] leading-relaxed text-[#0A2540] dark:border-[#B4AFFF]/40 dark:bg-[#635BFF]/10 dark:text-white/90">
                  <Lightbulb strokeWidth={1.5} className="mt-0.5 h-5 w-5 shrink-0 text-[#635BFF] dark:text-[#B4AFFF]" />
                  <p>
                    <span className="font-bold">{t("showcase_example")}: </span>
                    {t(`fd_${active.key}_ex`)}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Three big interactive cards (3D tilt on hover, shared-layout expansion on click). Stacked on phones. */
export function ProductShowcase() {
  const [openId, setOpenId] = useState<CardDef["id"] | null>(null);
  const open = CARDS.find((c) => c.id === openId) ?? null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {CARDS.map((c) => (
          <ShowcaseCard key={c.id} card={c} onOpen={() => setOpenId(c.id)} />
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(null)}
              className="fixed inset-0 z-40 bg-[#0A1220]/70 backdrop-blur-sm"
            />
            <ExpandedCard key="panel" card={open} onClose={() => setOpenId(null)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
