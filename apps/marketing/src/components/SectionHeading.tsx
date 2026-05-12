"use client";

import { motion } from "framer-motion";
import { cn } from "@vestra/ui";
import { blurFadeUp, sectionTitleLine, staggerContainer } from "../lib/motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      className={cn(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        "mb-10 md:mb-14",
        className,
      )}
    >
      {eyebrow ? (
        <motion.p
          variants={blurFadeUp}
          className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary"
        >
          {eyebrow}
        </motion.p>
      ) : null}
      <motion.h2
        variants={blurFadeUp}
        className="text-3xl font-semibold tracking-tight md:text-4xl"
      >
        {title}
      </motion.h2>
      <motion.div
        variants={sectionTitleLine}
        style={{ transformOrigin: align === "center" ? "center" : "left" }}
        className="mx-auto mt-4 h-[3px] w-16 rounded-full bg-[linear-gradient(90deg,hsl(217_91%_60%),hsl(142_71%_45%))]"
      />
      {description ? (
        <motion.p
          variants={blurFadeUp}
          className="mt-4 text-base text-muted-foreground md:text-lg"
        >
          {description}
        </motion.p>
      ) : null}
    </motion.div>
  );
}
