"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Banknote, CalendarDays, Check, Cog, GraduationCap, RotateCcw } from "lucide-react";

type Rect = { x: number; y: number; w: number; h: number };
type Layout = {
  w: number;
  h: number;
  teacher: Rect;
  system: Rect;
  pay: Rect;
  sched: Rect;
  p1: string;
  p2: string;
  p3: string;
  big: number; // font size of the result value
};

const DESKTOP: Layout = {
  w: 960,
  h: 380,
  teacher: { x: 20, y: 120, w: 240, h: 140 },
  system: { x: 360, y: 140, w: 240, h: 100 },
  pay: { x: 700, y: 30, w: 240, h: 110 },
  sched: { x: 700, y: 240, w: 240, h: 110 },
  p1: "M260 190 L360 190",
  p2: "M600 190 C 650 190 650 85 700 85",
  p3: "M600 190 C 650 190 650 295 700 295",
  big: 26,
};

const MOBILE: Layout = {
  w: 340,
  h: 560,
  teacher: { x: 30, y: 0, w: 280, h: 130 },
  system: { x: 30, y: 200, w: 280, h: 100 },
  pay: { x: 0, y: 400, w: 164, h: 130 },
  sched: { x: 176, y: 400, w: 164, h: 130 },
  p1: "M170 130 L170 200",
  p2: "M170 300 C 170 350 82 350 82 400",
  p3: "M170 300 C 170 350 258 350 258 400",
  big: 20,
};

const NODE = "fill-white dark:fill-[#111C30] stroke-[#E3E8EE] dark:stroke-white/15";
const INK = "fill-[#0A2540] dark:fill-white";
const MUTED = "fill-[#425466] dark:fill-white/60";

/** Dots that fly along a path (SVG SMIL, remounted via key to restart). */
function Dots({ d }: { d: string }) {
  return (
    <>
      {[0, 0.22, 0.44].map((b) => (
        <circle key={b} r={6} cx={0} cy={0} fill="#635BFF" opacity={0}>
          <animateMotion path={d} dur="0.9s" begin={`${b}s`} fill="freeze" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.9s" begin={`${b}s`} fill="freeze" />
        </circle>
      ))}
    </>
  );
}

function Diagram({ L, step, cycle }: { L: Layout; step: number; cycle: number }) {
  const t = useTranslations("landing");
  const { teacher: te, system: sy, pay, sched } = L;
  const btn: Rect = { x: te.x + 16, y: te.y + te.h - 56, w: te.w - 32, h: 40 };
  const done = step >= 1;
  const resultsOn = step >= 4;

  const line = (d: string, active: boolean) => (
    <>
      <path d={d} fill="none" strokeWidth={2} strokeDasharray="5 7" className="stroke-[#C4CCE0] dark:stroke-white/25">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path
        d={d}
        fill="none"
        stroke="#635BFF"
        strokeWidth={3}
        strokeLinecap="round"
        className={`transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );

  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} className="h-auto w-full" role="img" aria-label={t("workflow_intro")}>
      {line(L.p1, step >= 2)}
      {line(L.p2, step >= 3)}
      {line(L.p3, step >= 3)}

      {/* Teacher */}
      <rect x={te.x} y={te.y} width={te.w} height={te.h} rx={16} strokeWidth={1.5} className={NODE} />
      <GraduationCap x={te.x + 16} y={te.y + 14} width={24} height={24} strokeWidth={1.5} className="stroke-[#635BFF]" fill="none" />
      <text x={te.x + 50} y={te.y + 32} fontSize={16} fontWeight={700} className={INK}>
        {t("workflow_teacher")}
      </text>
      <rect
        x={btn.x}
        y={btn.y}
        width={btn.w}
        height={btn.h}
        rx={10}
        className={`transition-colors duration-500 ${done ? "fill-[#10B981]" : "fill-[#635BFF]"}`}
      />
      <text x={btn.x + btn.w / 2 - (done ? 10 : 0)} y={btn.y + 25} textAnchor="middle" fontSize={14} fontWeight={600} fill="#fff">
        {t("workflow_button")}
      </text>
      <Check
        x={btn.x + btn.w - 36}
        y={btn.y + 10}
        width={20}
        height={20}
        strokeWidth={2.5}
        stroke="#fff"
        fill="none"
        className={`transition-opacity duration-300 ${done ? "opacity-100" : "opacity-0"}`}
      />

      {/* System */}
      <rect x={sy.x} y={sy.y} width={sy.w} height={sy.h} rx={16} strokeWidth={2} className="fill-white dark:fill-[#111C30] stroke-[#635BFF]" />
      {step === 3 && (
        <rect key={`pulse-${cycle}`} x={sy.x} y={sy.y} width={sy.w} height={sy.h} rx={16} fill="none" stroke="#635BFF" strokeWidth={3}>
          <animate attributeName="x" values={`${sy.x};${sy.x - 12}`} dur="0.9s" repeatCount="2" />
          <animate attributeName="y" values={`${sy.y};${sy.y - 12}`} dur="0.9s" repeatCount="2" />
          <animate attributeName="width" values={`${sy.w};${sy.w + 24}`} dur="0.9s" repeatCount="2" />
          <animate attributeName="height" values={`${sy.h};${sy.h + 24}`} dur="0.9s" repeatCount="2" />
          <animate attributeName="opacity" values="0.7;0" dur="0.9s" repeatCount="2" />
        </rect>
      )}
      <Cog x={sy.x + sy.w / 2 - 14} y={sy.y + 18} width={28} height={28} strokeWidth={1.5} className="stroke-[#635BFF]" fill="none" />
      <text x={sy.x + sy.w / 2} y={sy.y + 76} textAnchor="middle" fontSize={18} fontWeight={700} className={INK}>
        {t("workflow_system")}
      </text>

      {/* Results */}
      {[
        { r: pay, Icon: Banknote, label: "workflow_pay", main: "+ 42,00 €", sub: "workflow_payValue" },
        { r: sched, Icon: CalendarDays, label: "workflow_schedule", main: null, sub: "workflow_scheduleValue" },
      ].map(({ r, Icon, label, main, sub }) => (
        <g key={label}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={16}
            strokeWidth={resultsOn ? 2 : 1.5}
            className={`transition-all duration-500 fill-white dark:fill-[#111C30] ${resultsOn ? "stroke-[#10B981]" : "stroke-[#E3E8EE] dark:stroke-white/15"}`}
          />
          <Icon x={r.x + 16} y={r.y + 14} width={24} height={24} strokeWidth={1.5} className="stroke-[#00A3C4]" fill="none" />
          <text x={r.x + 50} y={r.y + 32} fontSize={16} fontWeight={700} className={INK}>
            {t(label)}
          </text>
          <g className={`transition-opacity duration-500 ${resultsOn ? "opacity-100" : "opacity-0"}`}>
            {main ? (
              <text x={r.x + 16} y={r.y + r.h - 40} fontSize={L.big} fontWeight={800} className={INK}>
                {main}
              </text>
            ) : (
              <Check x={r.x + 16} y={r.y + r.h - 64} width={L.big + 6} height={L.big + 6} strokeWidth={2.5} stroke="#10B981" fill="none" />
            )}
            <text x={r.x + 16} y={r.y + r.h - 16} fontSize={14} fontWeight={500} className={MUTED}>
              {t(sub)}
            </text>
          </g>
        </g>
      ))}

      {/* Flying dots */}
      {step === 2 && <Dots key={`a-${cycle}`} d={L.p1} />}
      {step === 3 && (
        <>
          <Dots key={`b-${cycle}`} d={L.p2} />
          <Dots key={`c-${cycle}`} d={L.p3} />
        </>
      )}
    </svg>
  );
}

/** Teacher clicks "lesson held" -> system -> salary calculated + timetable updated. Loops; restarts on hover. */
export function WorkflowDiagram() {
  const t = useTranslations("landing");
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3, once: true });
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setStep(4);
      return;
    }
    setStep(0);
    const timers = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 1400),
      setTimeout(() => setStep(3), 2600),
      setTimeout(() => setStep(4), 3800),
      setTimeout(() => setCycle((c) => c + 1), 8000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, cycle, reduce]);

  const replay = () => setCycle((c) => c + 1);

  return (
    <div ref={ref} onMouseEnter={() => step >= 4 && !reduce && replay()}>
      <div className="hidden md:block">
        <Diagram L={DESKTOP} step={step} cycle={cycle} />
      </div>
      <div className="mx-auto max-w-sm md:hidden">
        <Diagram L={MOBILE} step={step} cycle={cycle} />
      </div>
      {!reduce && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-2 rounded-full border border-[#E3E8EE] dark:border-white/20 bg-white dark:bg-white/5 px-4 py-2 text-sm font-medium text-[#425466] dark:text-white/80 transition-colors hover:border-[#635BFF] hover:text-[#635BFF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#635BFF]"
          >
            <RotateCcw strokeWidth={1.5} className="h-4 w-4" />
            {t("workflow_replay")}
          </button>
        </div>
      )}
    </div>
  );
}
