import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
import { Button, FormField, Input } from "@vestra/ui";
import { api } from "../../api/client";
import { AuthLayout } from "./AuthLayout";
import { forgotSchema, type ForgotFormData } from "../../lib/schemas";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({ resolver: yupResolver(forgotSchema) });

  const onSubmit = async (data: ForgotFormData) => {
    await api.post("/auth/forgot-password", { email: data.email });
    setSent(true);
  };

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle={
        sent
          ? "Se o e-mail existir, enviaremos um link de redefinição em instantes"
          : "Informe seu e-mail e enviaremos um link para redefinir a senha"
      }
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Voltar para login
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          Verifique sua caixa de entrada (e o spam) nos próximos minutos.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="E-mail" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              invalid={!!errors.email}
              {...register("email")}
            />
          </FormField>
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            Enviar link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
