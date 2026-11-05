"use client";

import { useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Banknote, DoorOpen, GraduationCap, Users } from "lucide-react";

type Pt = [number, number];
type Spoke = { id: "teacher" | "students" | "finance" | "rooms"; box: { x: number; y: number }; from: Pt; c1: Pt; c2: Pt };
type Layout = { w: number; h: number; center: Pt; r: number; nodeW: number; nodeH: number; spokes: Spoke[] };

const ICONS = { teacher: GraduationCap, students: Users, finance: Banknote, rooms: DoorOpen } as const;

const DESKTOP: Layout = {
  w: 960,
  h: 440,
  center: [480, 220],
  r: 64,
  nodeW: 220,
  nodeH: 88,
  spokes: [
    { id: "teacher", box: { x: 40, y: 50 }, from: [260, 94], c1: [370, 94], c2: [380, 220] },
    { id: "students", box: { x: 700, y: 50 }, from: [700, 94], c1: [590, 94], c2: [580, 220] },
    { id: "finance", box: { x: 700, y: 302 }, from: [700, 346], c1: [590, 346], c2: [580, 220] },
    { id: "rooms", box: { x: 40, y: 302 }, from: [260, 346], c1: [370, 346], c2: [380, 220] },
  ],
};

const MOBILE: Layout = {
  w: 340,
  h: 560,
  center: [170, 280],
  r: 52,
  nodeW: 160,
  nodeH: 84,
  spokes: [
    { id: "teacher", box: { x: 0, y: 0 }, from: [80, 84], c1: [80, 190], c2: [120, 280] },
    { id: "students", box: { x: 180, y: 0 }, from: [260, 84], c1: [260, 190], c2: [220, 280] },
    { id: "finance", box: { x: 180, y: 476 }, from: [260, 476], c1: [260, 370], c2: [220, 280] },
    { id: "rooms", box: { x: 0, y: 476 }, from: [80, 476], c1: [80, 370], c2: [120, 280] },
  ],
};

const fwd = (s: Spoke, c: Pt) => `M${s.from[0]} ${s.from[1]} C ${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${c[0]} ${c[1]}`;
const rev = (s: Spoke, c: Pt) => `M${c[0]} ${c[1]} C ${s.c2[0]} ${s.c2[1]} ${s.c1[0]} ${s.c1[1]} ${s.from[0]} ${s.from[1]}`;

/** Light packet that loops along a path (SVG SMIL). Remounted via key when the speed changes. */
function Packet({ d, begin, dur, color, filter }: { d: string; begin: number; dur: number; color: string; filter: string }) {
  return (
    <circle r={5} cx={0} cy={0} fill={color} opacity={0} filter={`url(#${filter})`}>
      <animateMotion path={d} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
    </circle>
  );
}

function Hub({ L, hot, still, uid }: { L: Layout; hot: boolean; still: boolean; uid: string }) {
  const t = useTranslations("landing");
  const [cx, cy] = L.center;
  const dur = hot ? 1.3 : 2.6;
  const glow = `glow-${uid}`;
  const grad = `grad-${uid}`;
  const core = `core-${uid}`;

  return (
    <svg viewBox={`0 0 ${L.w} ${L.h}`} className="h-auto w-full" role="img" aria-label={t("workflow_intro")}>
      <defs>
        <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#635BFF" />
          <stop offset="100%" stopColor="#00C2FF" />
        </linearGradient>
        <radialGradient id={core} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#7A73FF" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
      </defs>

      {/* Spokes: dashed base, glowing line, packets in both directions */}
      {L.spokes.map((s) => {
        const d = fwd(s, L.center);
        return (
          <g key={s.id}>
            <path d={d} fill="none" stroke={`url(#${grad})`} strokeWidth={5} opacity={hot ? 0.55 : 0.3} filter={`url(#${glow})`} className="transition-opacity duration-500" />
            <path d={d} fill="none" strokeWidth={2} strokeDasharray="5 7" className="stroke-[#B9C2DA] dark:stroke-white/30">
              {!still && <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.2s" repeatCount="indefinite" />}
            </path>
          </g>
        );
      })}
      {!still &&
        L.spokes.map((s, i) => (
          <g key={`${s.id}-${hot}`}>
            <Packet d={fwd(s, L.center)} begin={i * 0.35} dur={dur} color="#635BFF" filter={glow} />
            <Packet d={fwd(s, L.center)} begin={i * 0.35 + dur / 2} dur={dur} color="#635BFF" filter={glow} />
            <Packet d={rev(s, L.center)} begin={i * 0.35 + dur / 4} dur={dur} color="#00B8D9" filter={glow} />
          </g>
        ))}

      {/* Nodes */}
      {L.spokes.map((s) => {
        const Icon = ICONS[s.id];
        const { x, y } = s.box;
        return (
          <g key={s.id}>
            <rect x={x} y={y} width={L.nodeW} height={L.nodeH} rx={16} strokeWidth={1.5} className="fill-white stroke-[#E3E8EE] dark:fill-[#111C30] dark:stroke-white/15" />
            <rect x={x + 14} y={y + 14} width={36} height={36} rx={10} fill={`url(#${grad})`} />
            <Icon x={x + 21} y={y + 21} width={22} height={22} strokeWidth={1.6} stroke="#fff" fill="none" />
            <text x={x + 60} y={y + 38} fontSize={17} fontWeight={700} className="fill-[#0A2540] dark:fill-white">
              {t(`hub_${s.id}`)}
            </text>
            <text x={x + 14} y={y + 72} fontSize={13} fontWeight={500} className="fill-[#425466] dark:fill-white/65">
              {t(`hub_${s.id}_d`)}
            </text>
          </g>
        );
      })}

      {/* Centre */}
      {!still &&
        [0, 1].map((k) => (
          <circle key={`${k}-${hot}`} cx={cx} cy={cy} r={L.r} fill="none" stroke="#635BFF" strokeWidth={2} opacity={0}>
            <animate attributeName="r" values={`${L.r};${L.r + 34}`} dur={hot ? "1.4s" : "2.8s"} begin={`${k * (hot ? 0.7 : 1.4)}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0" dur={hot ? "1.4s" : "2.8s"} begin={`${k * (hot ? 0.7 : 1.4)}s`} repeatCount="indefinite" />
          </circle>
        ))}
      <circle cx={cx} cy={cy} r={L.r + 8} fill="#635BFF" opacity={0.18} filter={`url(#${glow})`} />
      <circle cx={cx} cy={cy} r={L.r} fill={`url(#${core})`} />
      <GraduationCap x={cx - 14} y={cy - 36} width={28} height={28} strokeWidth={1.6} stroke="#fff" fill="none" />
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize={L.r > 60 ? 18 : 16} fontWeight={800} fill="#fff">
        {t("hub_center")}
      </text>
    </svg>
  );
}

/** Klasswerk in the middle, glowing lines with data packets to teachers, students, finance and rooms. */
export function HubDiagram() {
  const reduce = useReducedMotion() ?? false;
  const [hot, setHot] = useState(false);
  const uid = useId().replace(/:/g, "");

  return (
    <div onPointerEnter={() => setHot(true)} onPointerLeave={() => setHot(false)}>
      <div className="hidden md:block">
        <Hub L={DESKTOP} hot={hot} still={reduce} uid={`${uid}d`} />
      </div>
      <div className="mx-auto max-w-sm md:hidden">
        <Hub L={MOBILE} hot={hot} still={reduce} uid={`${uid}m`} />
      </div>
    </div>
  );
}
