import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, FormField, Input, toast } from "@vestra/ui";
import { api } from "../../api/client";
import { AuthLayout } from "./AuthLayout";
import { resetSchema, type ResetFormData } from "../../lib/schemas";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({ resolver: yupResolver(resetSchema) });

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        subtitle="O link de redefinição é inválido ou expirou"
        footer={
          <Link to="/forgot-password" className="text-primary hover:underline">
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Solicite um novo e-mail de redefinição para continuar.
        </p>
      </AuthLayout>
    );
  }

  const onSubmit = async (data: ResetFormData) => {
    try {
      await api.post("/auth/reset-password", { token, password: data.password });
      toast.success("Senha redefinida. Faça login.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Não foi possível redefinir. O link pode ter expirado.");
    }
  };

  return (
    <AuthLayout title="Nova senha" subtitle="Escolha uma senha forte para sua conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Nova senha"
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
            autoFocus
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
          Redefinir
        </Button>
      </form>
    </AuthLayout>
  );
}
