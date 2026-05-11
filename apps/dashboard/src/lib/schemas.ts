import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup.string().email("E-mail inválido").required("E-mail é obrigatório"),
  password: yup.string().required("Senha é obrigatória"),
});
export type LoginFormData = yup.InferType<typeof loginSchema>;

export const registerSchema = yup.object({
  name: yup.string().required("Nome é obrigatório"),
  email: yup.string().email("E-mail inválido").required("E-mail é obrigatório"),
  password: yup.string().min(8, "Mínimo 8 caracteres").required("Senha é obrigatória"),
  passwordConfirmation: yup
    .string()
    .oneOf([yup.ref("password")], "Senhas não conferem")
    .required("Confirmação obrigatória"),
});
export type RegisterFormData = yup.InferType<typeof registerSchema>;

export const forgotSchema = yup.object({
  email: yup.string().email("E-mail inválido").required("E-mail é obrigatório"),
});
export type ForgotFormData = yup.InferType<typeof forgotSchema>;

export const resetSchema = yup.object({
  password: yup.string().min(8, "Mínimo 8 caracteres").required("Senha é obrigatória"),
  passwordConfirmation: yup
    .string()
    .oneOf([yup.ref("password")], "Senhas não conferem")
    .required("Confirmação obrigatória"),
});
export type ResetFormData = yup.InferType<typeof resetSchema>;
