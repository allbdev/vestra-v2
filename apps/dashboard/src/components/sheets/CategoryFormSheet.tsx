import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toast,
} from "@vestra/ui";
import {
  useCreateCategory,
  useUpdateCategory,
  type CategoryInput,
} from "../../api/hooks/useCategories";
import type { Category } from "../../api/types";

const schema = yup.object({
  name: yup.string().required("Nome obrigatório").max(100),
  type: yup.mixed<1 | 2>().oneOf([1, 2]).required("Tipo obrigatório"),
  color: yup
    .string()
    .matches(/^#([0-9a-f]{6})$/i, "Cor inválida")
    .nullable()
    .optional(),
});
type FormData = yup.InferType<typeof schema>;

const PRESET_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#64748b",
];

export interface CategoryFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initial?: Category | null;
}

export function CategoryFormSheet({
  open,
  onOpenChange,
  workspaceId,
  initial,
}: CategoryFormSheetProps) {
  const create = useCreateCategory(workspaceId);
  const update = useUpdateCategory(workspaceId);
  const isEdit = !!initial;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: "", type: 2, color: "#22c55e" },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? { name: initial.name, type: initial.type, color: initial.color ?? "#22c55e" }
          : { name: "", type: 2, color: "#22c55e" },
      );
    }
  }, [open, initial, reset]);

  const onSubmit = async (data: FormData) => {
    const payload: CategoryInput = {
      name: data.name,
      type: data.type,
      color: data.color ?? null,
    };
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Categoria atualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Categoria criada");
      }
      onOpenChange(false);
    } catch {
      toast.error("Falha ao salvar categoria");
    }
  };

  const color = watch("color") ?? "#22c55e";
  const type = watch("type");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-2xl md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar categoria" : "Nova categoria"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Atualize os dados desta categoria." : "Crie uma categoria para classificar seus lançamentos."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <FormField label="Nome" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" autoFocus invalid={!!errors.name} {...register("name")} />
          </FormField>

          <FormField label="Tipo" error={errors.type?.message} required>
            <Select
              value={String(type)}
              onValueChange={(v) => setValue("type", Number(v) as 1 | 2, { shouldValidate: true })}
            >
              <SelectTrigger invalid={!!errors.type}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Receita</SelectItem>
                <SelectItem value="2">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Cor" error={errors.color?.message}>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c, { shouldValidate: true })}
                  aria-label={`Usar cor ${c}`}
                  className={`h-10 w-10 rounded-full ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    color.toLowerCase() === c ? "ring-2 ring-ring" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setValue("color", e.target.value, { shouldValidate: true })}
                className="h-10 w-12 cursor-pointer rounded-lg border border-input bg-background"
                aria-label="Cor personalizada"
              />
            </div>
          </FormField>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
