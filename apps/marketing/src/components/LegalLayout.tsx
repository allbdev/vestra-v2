"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AmbientBackground } from "./AmbientBackground";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ScrollProgress } from "./ScrollProgress";
import { blurFadeUp, staggerContainer, staggerItem } from "../lib/motion";

interface LegalLayoutProps {
  title: string;
  lastUpdate: string;
  children: ReactNode;
}

export function LegalLayout({ title, lastUpdate, children }: LegalLayoutProps) {
  return (
    <>
      <ScrollProgress />
      <AmbientBackground />
      <Header />
      <main className="relative pb-20 pt-32 md:pt-40">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={blurFadeUp}
              className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl"
            >
              {title}
            </motion.h1>
            <motion.p variants={staggerItem} className="mt-3 text-sm text-muted-foreground">
              Última atualização:{" "}
              {new Date(lastUpdate).toLocaleDateString("pt-BR")}
            </motion.p>
            <motion.div
              variants={staggerItem}
              className="mt-10 space-y-10 text-sm text-muted-foreground md:text-base"
            >
              {children}
            </motion.div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground md:text-2xl">
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}
