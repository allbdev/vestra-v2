"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Button } from "@vestra/ui";
import { ThemeToggle } from "./ThemeToggle";

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:5173";

export function Header() {
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 60], [0, 0.85]);
  const borderOpacity = useTransform(scrollY, [0, 60], [0, 1]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <motion.div
        aria-hidden
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 bg-background/95 backdrop-blur-md backdrop-saturate-150"
      />
      <motion.div
        aria-hidden
        style={{ opacity: borderOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border"
      />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">
            V
          </span>
          <span className="text-base font-semibold">Vestra</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Funcionalidades
          </a>
          <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
            Planos
          </a>
          <a href="#faq" className="text-muted-foreground transition-colors hover:text-foreground">
            Perguntas
          </a>
          <a href="#contact" className="text-muted-foreground transition-colors hover:text-foreground">
            Contato
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <a href={`${dashboardUrl}/login`}>Entrar</a>
          </Button>
          <Button asChild size="sm">
            <a href={`${dashboardUrl}/register`}>Começar grátis</a>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
