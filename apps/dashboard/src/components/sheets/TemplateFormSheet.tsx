import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  FormField,
  Input,
  MoneyInput,
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
  Switch,
  toast,
} from "@vestra/ui";
import {
  useCreateTemplate,
  useUpdateTemplate,
  type TemplateInput,
} from "../../api/hooks/useTemplates";
import { useCategories } from "../../api/hooks/useCategories";
import { toDateInputValue } from "../../lib/format";
import { toNumber, type TransactionTemplate } from "../../api/types";

const schema = yup.object({
  description: yup.string().required("Descrição obrigatória").max(255),
  baseAmount: yup.number().moreThan(0, "Valor deve ser maior que 0").required().typeError("Valor obrigatório"),
  categoryId: yup.string().required("Categoria obrigatória"),
  frequency: yup.mixed<1 | 2 | 3 | 4>().oneOf([1, 2, 3, 4]).required("Frequência obrigatória"),
  startDate: yup.string().required("Data inicial obrigatória"),
  active: yup.boolean().default(true),
});
type FormData = yup.InferType<typeof schema>;

const FREQUENCY_LABEL: Record<1 | 2 | 3 | 4, string> = {
  1: "Diário",
  2: "Semanal",
  3: "Mensal",
  4: "Anual",
};

export interface TemplateFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initial?: TransactionTemplate | null;
}

export function TemplateFormSheet({
  open,
  onOpenChange,
  workspaceId,
  initial,
}: TemplateFormSheetProps) {
  const create = useCreateTemplate(workspaceId);
  const update = useUpdateTemplate(workspaceId);
  const { data: categories = [] } = useCategories(workspaceId);
  const isEdit = !!initial;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      description: "",
      baseAmount: 0,
      categoryId: "",
      frequency: 3,
      startDate: toDateInputValue(),
      active: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              description: initial.description,
              baseAmount: toNumber(initial.baseAmount),
              categoryId: initial.categoryId ?? "",
              frequency: (initial.frequency ?? 3) as 1 | 2 | 3 | 4,
              startDate: initial.startDate.slice(0, 10),
              active: initial.active,
            }
          : {
              description: "",
              baseAmount: 0,
              categoryId: "",
              frequency: 3,
              startDate: toDateInputValue(),
              active: true,
            },
      );
    }
  }, [open, initial, reset]);

  const categoryId = watch("categoryId");
  const frequency = watch("frequency");

  const onSubmit = async (data: FormData) => {
    const payload: TemplateInput = {
      description: data.description,
      baseAmount: data.baseAmount,
      categoryId: data.categoryId,
      frequency: data.frequency,
      startDate: data.startDate,
      active: data.active,
    };
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Recorrência atualizada");
      } else {
        await create.mutateAsync(payload);
        toast.success("Recorrência criada");
      }
      onOpenChange(false);
    } catch {
      toast.error("Falha ao salvar recorrência");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-2xl md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar recorrência" : "Nova recorrência"}</SheetTitle>
          <SheetDescription>
            Lançamentos são gerados automaticamente a partir deste modelo.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <FormField label="Descrição" htmlFor="description" error={errors.description?.message} required>
            <Input
              id="description"
              autoFocus
              invalid={!!errors.description}
              {...register("description")}
            />
          </FormField>

          <FormField label="Valor base" error={errors.baseAmount?.message} required>
            <Controller
              control={control}
              name="baseAmount"
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onValueChange={(v) => field.onChange(v ?? 0)}
                  invalid={!!errors.baseAmount}
                />
              )}
            />
          </FormField>

          <FormField label="Categoria" error={errors.categoryId?.message} required>
            <Select
              value={categoryId}
              onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })}
            >
              <SelectTrigger invalid={!!errors.categoryId}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Frequência" error={errors.frequency?.message} required>
            <Select
              value={String(frequency)}
              onValueChange={(v) =>
                setValue("frequency", Number(v) as 1 | 2 | 3 | 4, { shouldValidate: true })
              }
            >
              <SelectTrigger invalid={!!errors.frequency}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3, 4] as const).map((k) => (
                  <SelectItem key={k} value={String(k)}>
                    {FREQUENCY_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data inicial" htmlFor="startDate" error={errors.startDate?.message} required>
            <Input id="startDate" type="date" invalid={!!errors.startDate} {...register("startDate")} />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Ativa</p>
              <p className="text-xs text-muted-foreground">
                Pausa a geração automática quando desativada.
              </p>
            </div>
            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

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
