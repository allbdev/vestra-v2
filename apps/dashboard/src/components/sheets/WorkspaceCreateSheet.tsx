import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  FormField,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toast,
} from "@vestra/ui";
import { useCreateWorkspace } from "../../api/hooks/useWorkspaces";
import { useWorkspace } from "../../workspace/WorkspaceProvider";

const schema = yup.object({
  name: yup.string().required("Nome obrigatório").max(255),
});
type FormData = yup.InferType<typeof schema>;

export interface WorkspaceCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceCreateSheet({ open, onOpenChange }: WorkspaceCreateSheetProps) {
  const create = useCreateWorkspace();
  const { setActive } = useWorkspace();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: yupResolver(schema), defaultValues: { name: "" } });

  useEffect(() => {
    if (open) reset({ name: "" });
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const ws = await create.mutateAsync(data.name);
      setActive(ws.id);
      toast.success("Workspace criado");
      onOpenChange(false);
    } catch {
      toast.error("Falha ao criar workspace. Verifique seu plano.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-lg md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>Novo workspace</SheetTitle>
          <SheetDescription>
            Workspaces agrupam categorias e lançamentos. Compartilhe com familiares no plano Pro.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <FormField label="Nome" htmlFor="name" error={errors.name?.message} required>
            <Input
              id="name"
              autoFocus
              placeholder="Finanças da família"
              invalid={!!errors.name}
              {...register("name")}
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Criar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
