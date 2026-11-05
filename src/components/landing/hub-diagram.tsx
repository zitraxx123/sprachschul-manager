"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Banknote, BookOpenCheck, DoorOpen, GraduationCap, Settings2, ShieldCheck, Users } from "lucide-react";

type Icon = React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
type Node = { id: string; x: number; y: number; w: number; h: number; icon: Icon; level: 0 | 1 | 2 };
type Layout = { w: number; h: number; font: number; nodes: Node[]; paths: Array<{ d: string; phase: "in" | "out" }> };

/* Desktop: two sources on top, system in the middle, four modules in a row. Orthogonal lines only. */
const DESKTOP: Layout = {
  w: 960,
  h: 500,
  font: 15,
  nodes: [
    { id: "admin", x: 190, y: 20, w: 260, h: 76, icon: ShieldCheck, level: 0 },
    { id: "teacher", x: 510, y: 20, w: 260, h: 76, icon: GraduationCap, level: 0 },
    { id: "system", x: 330, y: 210, w: 300, h: 84, icon: Settings2, level: 1 },
    { id: "courses", x: 25, y: 400, w: 205, h: 84, icon: Users, level: 2 },
    { id: "lessons", x: 260, y: 400, w: 205, h: 84, icon: BookOpenCheck, level: 2 },
    { id: "finance", x: 495, y: 400, w: 205, h: 84, icon: Banknote, level: 2 },
    { id: "rooms", x: 730, y: 400, w: 205, h: 84, icon: DoorOpen, level: 2 },
  ],
  paths: [
    { d: "M320 96 V153 H420 V210", phase: "in" },
    { d: "M640 96 V153 H540 V210", phase: "in" },
    { d: "M480 294 V347 H127.5 V400", phase: "out" },
    { d: "M480 294 V347 H362.5 V400", phase: "out" },
    { d: "M480 294 V347 H597.5 V400", phase: "out" },
    { d: "M480 294 V347 H832.5 V400", phase: "out" },
  ],
};

/* Phone: sources side by side, system below, modules in a 2 x 2 grid. */
const MOBILE: Layout = {
  w: 340,
  h: 566,
  font: 13,
  nodes: [
    { id: "admin", x: 0, y: 0, w: 160, h: 72, icon: ShieldCheck, level: 0 },
    { id: "teacher", x: 180, y: 0, w: 160, h: 72, icon: GraduationCap, level: 0 },
    { id: "system", x: 30, y: 180, w: 280, h: 80, icon: Settings2, level: 1 },
    { id: "courses", x: 0, y: 370, w: 160, h: 76, icon: Users, level: 2 },
    { id: "lessons", x: 180, y: 370, w: 160, h: 76, icon: BookOpenCheck, level: 2 },
    { id: "finance", x: 0, y: 490, w: 160, h: 76, icon: Banknote, level: 2 },
    { id: "rooms", x: 180, y: 490, w: 160, h: 76, icon: DoorOpen, level: 2 },
  ],
  paths: [
    { d: "M80 72 V126 H125 V180", phase: "in" },
    { d: "M260 72 V126 H215 V180", phase: "in" },
    { d: "M170 260 V315 H80 V370", phase: "out" },
    { d: "M170 260 V315 H260 V370", phase: "out" },
    { d: "M170 260 V468 H80 V490", phase: "out" },
    { d: "M170 260 V468 H260 V490", phase: "out" },
  ],
};

const BORDER = "#D5DDE8";
const GLOW = "#00B8D9";

/** Split a label into at most two lines when it would not fit the available width. */
function wrap(text: string, maxWidth: number, font: number): string[] {
  if (text.length * font * 0.56 <= maxWidth) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return best < 0 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

/** One glowing data packet that travels along a path during its phase of the loop, then rests invisible. */
function Packet({ d, phase, cycle, begin, uid }: { d: string; phase: "in" | "out"; cycle: number; begin: number; uid: string }) {
  const inbound = phase === "in";
  return (
    <g opacity={0}>
      <circle r={11} fill={GLOW} opacity={0.35} filter={`url(#glow-${uid})`} />
      <circle r={4.5} fill="#0A84FF" />
      <animateMotion
        path={d}
        dur={`${cycle}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        calcMode="linear"
        keyPoints={inbound ? "0;1;1" : "0;0;1;1"}
        keyTimes={inbound ? "0;0.45;1" : "0;0.5;0.95;1"}
      />
      <animate
        attributeName="opacity"
        dur={`${cycle}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        values={inbound ? "0;1;1;0;0" : "0;0;1;1;0;0"}
        keyTimes={inbound ? "0;0.03;0.42;0.45;1" : "0;0.5;0.53;0.92;0.95;1"}
      />
    </g>
  );
}

function Diagram({ L, hot, still, uid }: { L: Layout; hot: boolean; still: boolean; uid: string }) {
  const t = useTranslations("landing");
  const cycle = hot ? 2.6 : 4.2;
  const lineH = L.font + 4;

  /* Border glow keyed to the loop: sources at the start, system when packets arrive, modules at the end */
  const glowValues: Record<0 | 1 | 2, { values: string; keyTimes: string }> = {
    0: { values: `${GLOW};${BORDER};${BORDER}`, keyTimes: "0;0.12;1" },
    1: { values: `${BORDER};${BORDER};${GLOW};${BORDER};${BORDER}`, keyTimes: "0;0.44;0.5;0.62;1" },
    2: { values: `${BORDER};${BORDER};${GLOW};${BORDER}`, keyTimes: "0;0.94;0.97;1" },
  };

  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} className="h-auto w-full" role="img" aria-label={t("workflow_intro")}>
      <defs>
        <filter id={`glow-${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`shadow-${uid}`} x="-10%" y="-10%" width="120%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#0A2540" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* Orthogonal lines */}
      {L.paths.map((p) => (
        <path key={p.d} d={p.d} fill="none" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="butt" className="stroke-[#CBD5E1] dark:stroke-white/25" />
      ))}

      {/* Blocks */}
      {L.nodes.map((n, idx) => {
        const Icon = n.icon;
        const textX = n.x + 58;
        const lines = wrap(t(`hub2_${n.id}`), n.w - 58 - 12, L.font);
        const startY = n.y + n.h / 2 - ((lines.length - 1) * lineH) / 2 + L.font * 0.35;
        const accent = n.id === "system";
        return (
          <motion.g
            key={n.id}
            initial={still ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: n.level * 0.15 + (idx % 4) * 0.04 }}
          >
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={14}
              strokeWidth={accent ? 2 : 1.5}
              stroke={BORDER}
              filter={`url(#shadow-${uid})`}
              className="fill-white dark:fill-[#111C30]"
            >
              {!still && (
                <animate
                  key={`${n.id}-${hot}`}
                  attributeName="stroke"
                  dur={`${cycle}s`}
                  repeatCount="indefinite"
                  values={glowValues[n.level].values}
                  keyTimes={glowValues[n.level].keyTimes}
                />
              )}
            </rect>
            <rect x={n.x + 14} y={n.y + n.h / 2 - 17} width={34} height={34} rx={10} className={accent ? "fill-[#635BFF]" : "fill-[#EAF2FF] dark:fill-white/10"} />
            <Icon
              x={n.x + 21}
              y={n.y + n.h / 2 - 10}
              width={20}
              height={20}
              strokeWidth={1.7}
              fill="none"
              className={accent ? "stroke-white" : "stroke-[#2563EB] dark:stroke-[#9CC2FF]"}
            />
            <text fontSize={L.font} fontWeight={accent ? 800 : 600} className="fill-[#0A2540] dark:fill-white">
              {lines.map((ln, i) => (
                <tspan key={i} x={textX} y={startY + i * lineH}>
                  {ln}
                </tspan>
              ))}
            </text>
          </motion.g>
        );
      })}

      {/* Data packets: sources to system, then system to modules */}
      {!still &&
        L.paths.map((p) => (
          <g key={`${p.d}-${hot}`}>
            <Packet d={p.d} phase={p.phase} cycle={cycle} begin={0} uid={uid} />
            <Packet d={p.d} phase={p.phase} cycle={cycle} begin={cycle * 0.07} uid={uid} />
          </g>
        ))}
    </svg>
  );
}

/** Top-down architecture diagram: admin + teacher -> Klasswerk system -> four modules, with packets flying along the lines. */
export function HubDiagram() {
  const reduce = useReducedMotion() ?? false;
  const [hot, setHot] = useState(false);
  const uid = useId().replace(/:/g, "");

  return (
    <div onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}>
      <div className="hidden md:block">
        <Diagram L={DESKTOP} hot={hot} still={reduce} uid={`${uid}d`} />
      </div>
      <div className="mx-auto max-w-sm md:hidden">
        <Diagram L={MOBILE} hot={hot} still={reduce} uid={`${uid}m`} />
      </div>
    </div>
  );
}
