"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Soft blurred colour blobs behind the hero (blue, teal, violet). */
export function HeroBackdrop() {
  const reduce = useReducedMotion();
  const drift = (x: number, y: number, d: number) =>
    reduce
      ? undefined
      : { x: [0, x, 0], y: [0, y, 0], transition: { duration: d, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={drift(40, 30, 14)}
        className="absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[#635BFF]/25 dark:bg-[#635BFF]/30 blur-3xl"
      />
      <motion.div
        animate={drift(-50, 40, 18)}
        className="absolute -top-24 right-0 h-[26rem] w-[26rem] rounded-full bg-[#00C2FF]/25 dark:bg-[#00C2FF]/20 blur-3xl"
      />
      <motion.div
        animate={drift(30, -40, 16)}
        className="absolute top-72 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#2DD4BF]/20 dark:bg-[#2DD4BF]/15 blur-3xl"
      />
      <motion.div
        animate={drift(-30, -30, 20)}
        className="absolute top-40 right-1/4 h-[20rem] w-[20rem] rounded-full bg-[#A78BFA]/25 dark:bg-[#A78BFA]/20 blur-3xl"
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#F6F9FC] dark:from-[#0A1220] to-transparent" />
    </div>
  );
}
