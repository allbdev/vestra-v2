"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";
import axios from "axios";
import { Button, FormField, Input, Textarea } from "@vestra/ui";
import { SectionHeading } from "./SectionHeading";
import { blurFadeUp } from "../lib/motion";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const schema = yup.object({
  name: yup.string().required("Nome obrigatório").max(255),
  email: yup.string().email("E-mail inválido").required("E-mail obrigatório"),
  phone: yup.string().max(50).optional(),
  message: yup.string().required("Mensagem obrigatória").min(10, "Mínimo 10 caracteres"),
});
type FormData = yup.InferType<typeof schema>;

export function Contact() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await axios.post(`${apiUrl}/contact`, data);
      setSent(true);
      reset();
    } catch {
      // Surface non-blocking — the form stays open for retry.
      console.error("Contact submit failed");
    }
  };

  return (
    <section id="contact" className="relative py-20 md:py-32">
      <div className="mx-auto max-w-2xl px-4 md:px-6">
        <SectionHeading
          eyebrow="Contato"
          title="Fale com a gente"
          description="Dúvidas, sugestões, parcerias. Respondemos em até 1 dia útil."
        />

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-success/40 bg-success/10 p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-success"
              >
                <CheckCircle2 className="h-7 w-7" />
              </motion.div>
              <h3 className="text-lg font-semibold">Mensagem enviada</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Te respondemos em breve. Pode fechar essa janela ou enviar outra.
              </p>
              <Button onClick={() => setSent(false)} variant="outline" className="mt-6">
                Enviar outra
              </Button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              variants={blurFadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 rounded-2xl border border-border bg-card p-6 md:p-8"
              noValidate
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Nome" htmlFor="name" error={errors.name?.message} required>
                  <Input
                    id="name"
                    autoComplete="name"
                    invalid={!!errors.name}
                    {...register("name")}
                  />
                </FormField>
                <FormField label="E-mail" htmlFor="email" error={errors.email?.message} required>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    invalid={!!errors.email}
                    {...register("email")}
                  />
                </FormField>
              </div>
              <FormField label="Telefone" htmlFor="phone" error={errors.phone?.message}>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  invalid={!!errors.phone}
                  {...register("phone")}
                />
              </FormField>
              <FormField label="Mensagem" htmlFor="message" error={errors.message?.message} required>
                <Textarea
                  id="message"
                  rows={5}
                  invalid={!!errors.message}
                  {...register("message")}
                />
              </FormField>
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button type="submit" loading={isSubmitting} className="w-full gap-2" size="lg">
                  <Send className="h-4 w-4" /> Enviar mensagem
                </Button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
