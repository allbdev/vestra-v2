import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import { Button, CodeInput, FormField, Input, toast } from "@vestra/ui";
import { AxiosError } from "axios";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";
import { registerSchema, type RegisterFormData } from "../../lib/schemas";

type Step = "form" | "confirm";

export function RegisterPage() {
  const [step, setStep] = useState<Step>("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: yupResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await api.post("/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setPendingEmail(data.email);
      setPendingPassword(data.password);
      setStep("confirm");
      toast.success("Código enviado para o seu e-mail");
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.status === 409
          ? "E-mail já cadastrado"
          : "Falha ao cadastrar. Tente novamente.";
      toast.error(msg);
    }
  };

  const onConfirm = async () => {
    if (code.length !== 6) return;
    setConfirming(true);
    try {
      await api.post("/auth/register/confirm", { email: pendingEmail, code });
      await login(pendingEmail, pendingPassword);
      navigate("/", { replace: true });
    } catch {
      toast.error("Código inválido ou expirado");
    } finally {
      setConfirming(false);
    }
  };

  if (step === "confirm") {
    return (
      <AuthLayout
        title="Confirme seu e-mail"
        subtitle={`Insira o código de 6 dígitos enviado para ${pendingEmail}`}
        footer={
          <button
            type="button"
            onClick={() => setStep("form")}
            className="text-primary hover:underline"
          >
            Usar outro e-mail
          </button>
        }
      >
        <div className="space-y-6">
          <CodeInput value={code} onChange={setCode} autoFocus />
          <Button
            onClick={onConfirm}
            loading={confirming}
            disabled={code.length !== 6}
            size="lg"
            className="w-full"
          >
            Confirmar
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Crie sua conta"
      subtitle="Comece a controlar suas finanças hoje"
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Nome" htmlFor="name" error={errors.name?.message} required>
          <Input
            id="name"
            autoComplete="name"
            invalid={!!errors.name}
            autoFocus
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
        <FormField
          label="Senha"
          htmlFor="password"
          hint="Mínimo 8 caracteres"
          error={errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>
        <FormField
          label="Confirmar senha"
          htmlFor="passwordConfirmation"
          error={errors.passwordConfirmation?.message}
          required
        >
          <Input
            id="passwordConfirmation"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.passwordConfirmation}
            {...register("passwordConfirmation")}
          />
        </FormField>
        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
