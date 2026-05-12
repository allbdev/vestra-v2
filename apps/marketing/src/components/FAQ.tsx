"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@vestra/ui";
import { SectionHeading } from "./SectionHeading";
import { staggerContainer, staggerItem } from "../lib/motion";

const FAQS = [
  {
    q: "Vestra é grátis mesmo?",
    a: "Sim. O plano grátis dá conta da maioria dos usuários — 1 workspace, 2 usuários, e todas as funcionalidades. O Pro só é necessário quando você quer mais workspaces ou compartilhar com mais gente.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Senhas são armazenadas com bcrypt e a sessão usa JWT com cookie httpOnly. Banco de dados Postgres com criptografia em trânsito e em repouso. Você pode excluir sua conta a qualquer momento.",
  },
  {
    q: "Funciona no celular?",
    a: "Vestra é mobile-first. Funciona como PWA instalável (adicione à tela inicial) e tem suporte offline para os dados já carregados. iOS e Android suportados.",
  },
  {
    q: "Posso importar lançamentos de outro app?",
    a: "Ainda não, mas é uma das próximas funcionalidades. Por enquanto, recorrências automáticas resolvem a maior parte do trabalho repetitivo.",
  },
  {
    q: "Como cancelo o Pro?",
    a: "Direto pelas configurações. Você continua com acesso até o fim do ciclo já pago, e depois volta automaticamente para o plano grátis (sem perder seus dados).",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Perguntas"
          title="Perguntas frequentes"
          description="Não encontrou? Manda mensagem no formulário abaixo."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <Accordion
            type="single"
            collapsible
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            {FAQS.map((item, i) => (
              <motion.div key={item.q} variants={staggerItem}>
                <AccordionItem value={`item-${i}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
