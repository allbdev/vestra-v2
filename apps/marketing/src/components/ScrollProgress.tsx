"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: "0%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] bg-[linear-gradient(90deg,hsl(217_91%_60%),hsl(142_71%_45%))]"
    />
  );
}
