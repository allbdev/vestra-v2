"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  Bell,
  PieChart,
  Repeat,
  Smartphone,
  Users,
} from "lucide-react";
import { cn } from "@vestra/ui";
import { SectionHeading } from "./SectionHeading";
import { TiltCard } from "./TiltCard";
import { cardHover, staggerContainer, staggerItem } from "../lib/motion";

const FEATURES = [
  {
    icon: ArrowLeftRight,
    title: "Lançamentos rápidos",
    description:
      "Cadastre receitas e despesas em segundos. Tudo organizado por categoria e data, com filtros por período e status.",
    accent: "from-primary/20 to-primary/0",
  },
  {
    icon: Repeat,
    title: "Recorrências automáticas",
    description:
      "Modelos diários, semanais, mensais ou anuais geram seus lançamentos sem você precisar lembrar.",
    accent: "from-secondary/20 to-secondary/0",
  },
  {
    icon: PieChart,
    title: "Gráficos que falam por você",
    description:
      "Saldo mensal, saldo acumulado e top categorias de despesa — tudo em um dashboard mobile-first.",
    accent: "from-info/20 to-info/0",
  },
  {
    icon: Users,
    title: "Workspaces compartilhados",
    description:
      "Convide sua família ou time. Cada um vê tudo e edita só os próprios lançamentos.",
    accent: "from-success/20 to-success/0",
  },
  {
    icon: Smartphone,
    title: "PWA instalável",
    description:
      "Adicione à tela inicial e use offline. Funciona exatamente como um app nativo, sem App Store.",
    accent: "from-warning/20 to-warning/0",
  },
  {
    icon: Bell,
    title: "Sem surpresas",
    description:
      "Marque cada lançamento como pago ou pendente. Saiba sempre o que já saiu e o que ainda vem.",
    accent: "from-destructive/20 to-destructive/0",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Funcionalidades"
          title="Tudo que você precisa para tomar o controle"
          description="Mobile-first, rápido e bonito em qualquer tela. Pensado para o dia a dia."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={staggerItem}>
                <TiltCard className="h-full">
                  <motion.div
                    variants={cardHover}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6"
                  >
                    <div
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                        f.accent,
                      )}
                    />
                    <div className="relative">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                      <p className="text-sm text-muted-foreground">{f.description}</p>
                    </div>
                  </motion.div>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
