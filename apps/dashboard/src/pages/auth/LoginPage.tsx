import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button, FormField, Input, toast } from "@vestra/ui";
import { AxiosError } from "axios";
import { useAuth } from "../../auth/AuthProvider";
import { AuthLayout } from "./AuthLayout";
import { loginSchema, type LoginFormData } from "../../lib/schemas";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: yupResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.status === 401
          ? "E-mail ou senha incorretos"
          : "Falha ao entrar. Tente novamente.";
      toast.error(msg);
    }
  };

  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta Vestra"
      footer={
        <>
          Não tem conta?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
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
        <FormField label="Senha" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
