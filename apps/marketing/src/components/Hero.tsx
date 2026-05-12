"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Download } from "lucide-react";
import { useRef } from "react";
import { Button } from "@vestra/ui";
import { blurFadeUp, staggerContainer, staggerItem } from "../lib/motion";

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:5173";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <section
      ref={ref}
      id="home"
      className="relative flex min-h-[88vh] flex-col justify-center px-4 pb-16 pt-32 md:px-6 md:pt-40"
    >
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col justify-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          style={{ y }}
          className="text-center"
        >
          <motion.span
            variants={staggerItem}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Beta aberta · controle financeiro
          </motion.span>

          <motion.h1
            variants={blurFadeUp}
            className="mt-6 text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          >
            Suas finanças em{" "}
            <span className="text-gradient">um só lugar</span>.
            <br className="hidden md:block" />
            Compartilhe sem perder o controle.
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Acompanhe receitas, despesas e recorrências. Convide sua família para um
            workspace e gerencie tudo no celular ou no desktop.
          </motion.p>

          <motion.div
            variants={staggerItem}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button asChild size="lg" className="gap-2">
                <a href={`${dashboardUrl}/register`}>
                  Começar grátis <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button asChild size="lg" variant="outline" className="gap-2">
                <a href="#features">
                  <Download className="h-4 w-4" /> Ver funcionalidades
                </a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mt-6 text-xs text-muted-foreground"
          >
            Sem cartão de crédito · cancele quando quiser
          </motion.p>
        </motion.div>
      </div>

      <motion.a
        href="#features"
        aria-label="Rolar para baixo"
        style={{ opacity: indicatorOpacity }}
        className="mx-auto mt-12 flex w-fit flex-col items-center gap-1 text-xs text-muted-foreground"
      >
        <span>Role para descobrir</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-6 w-px bg-muted-foreground/50"
        />
      </motion.a>
    </section>
  );
}
