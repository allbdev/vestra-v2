"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Two slow-drifting gradient orbs + a faint grid behind everything. */
export function AmbientBackground() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="bg-grid absolute inset-0 opacity-30" />
      {!reduced ? (
        <>
          <motion.div
            className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-primary/40 blur-[120px] md:h-[560px] md:w-[560px]"
            animate={{
              x: [0, 30, -10, 0],
              y: [0, -20, 14, 0],
              opacity: [0.45, 0.7, 0.5, 0.45],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-secondary/30 blur-[120px] md:h-[560px] md:w-[560px]"
            animate={{
              x: [0, -30, 16, 0],
              y: [0, 22, -14, 0],
              opacity: [0.4, 0.6, 0.45, 0.4],
            }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute left-1/2 top-2/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-primary/25 blur-[100px] md:h-[440px] md:w-[440px]"
            animate={{
              x: [0, 18, -22, 0],
              y: [0, -14, 18, 0],
              opacity: [0.3, 0.55, 0.4, 0.3],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : (
        <>
          <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-primary/40 blur-[120px]" />
          <div className="absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-secondary/30 blur-[120px]" />
        </>
      )}
    </div>
  );
}
