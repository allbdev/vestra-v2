"use client";

import { motion } from "framer-motion";
import { Check, Clock, Lock } from "lucide-react";
import { Button, cn } from "@vestra/ui";
import { SectionHeading } from "./SectionHeading";
import { staggerContainer, staggerItem } from "../lib/motion";

const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:5173";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight: boolean;
  comingSoon?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    description: "Para quem quer começar a organizar.",
    features: [
      "1 workspace",
      "Até 2 usuários (você + 1)",
      "Categorias, lançamentos e recorrências ilimitados",
      "Dashboard com gráficos",
      "PWA instalável",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 19,90",
    period: "por mês",
    description: "Para famílias ou times que precisam compartilhar.",
    features: [
      "Workspaces ilimitados",
      "Usuários ilimitados por workspace",
      "Suporte prioritário",
      "Tudo do plano grátis",
    ],
    cta: "Em breve",
    highlight: true,
    comingSoon: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Planos"
          title="Preço justo, sem pegadinha"
          description="Comece grátis. Suba para Pro quando precisar compartilhar com mais gente."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 md:grid-cols-2"
        >
          {PLANS.map((plan) => (
            <motion.div
              key={plan.name}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8",
                plan.highlight ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border",
              )}
            >
              {plan.highlight ? (
                <motion.div
                  aria-hidden
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                />
              ) : null}

              {plan.comingSoon ? (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
                  <Clock className="h-3 w-3" /> Em breve
                </span>
              ) : null}

              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums tracking-tight",
                    plan.highlight && "text-gradient",
                  )}
                >
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                <Button
                  type="button"
                  size="lg"
                  variant={plan.highlight ? "default" : "outline"}
                  className="mt-8 w-full gap-2"
                  disabled
                  aria-disabled
                  title="Plano Pro estará disponível em breve"
                >
                  <Lock className="h-4 w-4" /> {plan.cta}
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  variant={plan.highlight ? "default" : "outline"}
                  className="mt-8 w-full"
                >
                  <a href={`${dashboardUrl}/register`}>{plan.cta}</a>
                </Button>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
