"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect } from "react";

/** Soft gradient that follows the cursor on desktop. Hidden on touch + reduced motion. */
export function CursorGlow() {
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const springX = useSpring(x, { stiffness: 80, damping: 22, restDelta: 0.5 });
  const springY = useSpring(y, { stiffness: 80, damping: 22, restDelta: 0.5 });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const handler = (e: MouseEvent) => {
      x.set(e.clientX - 300);
      y.set(e.clientY - 300);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [x, y, reduced]);

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      style={{ x: springX, y: springY }}
      className="pointer-events-none fixed left-0 top-0 -z-10 hidden h-[600px] w-[600px] rounded-full md:block"
    >
      <div className="h-full w-full rounded-full bg-[radial-gradient(circle_at_center,hsl(142_71%_45%/0.10),transparent_65%)]" />
    </motion.div>
  );
}
