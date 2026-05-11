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
  useCreateTransaction,
  useUpdateTransaction,
  type TransactionInput,
} from "../../api/hooks/useTransactions";
import { useCategories } from "../../api/hooks/useCategories";
import { toDateInputValue } from "../../lib/format";
import { toNumber as toNum, type Transaction } from "../../api/types";

const schema = yup.object({
  description: yup.string().required("Descrição obrigatória").max(255),
  amount: yup.number().moreThan(0, "Valor deve ser maior que 0").required().typeError("Valor obrigatório"),
  categoryId: yup.string().nullable().optional(),
  date: yup.string().required("Data obrigatória"),
  isPaid: yup.boolean().default(false),
  paidAt: yup.string().nullable().optional(),
});
type FormData = yup.InferType<typeof schema>;

export interface TransactionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initial?: Transaction | null;
}

export function TransactionFormSheet({
  open,
  onOpenChange,
  workspaceId,
  initial,
}: TransactionFormSheetProps) {
  const create = useCreateTransaction(workspaceId);
  const update = useUpdateTransaction(workspaceId);
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
      amount: 0,
      categoryId: null,
      date: toDateInputValue(),
      isPaid: false,
      paidAt: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        initial
          ? {
              description: initial.description,
              amount: toNum(initial.amount),
              categoryId: initial.categoryId,
              date: initial.date.slice(0, 10),
              isPaid: initial.isPaid,
              paidAt: initial.paidAt?.slice(0, 10) ?? null,
            }
          : {
              description: "",
              amount: 0,
              categoryId: null,
              date: toDateInputValue(),
              isPaid: false,
              paidAt: null,
            },
      );
    }
  }, [open, initial, reset]);

  const isPaid = watch("isPaid");
  const categoryId = watch("categoryId") ?? "";

  const onSubmit = async (data: FormData) => {
    const payload: TransactionInput = {
      description: data.description,
      amount: data.amount,
      categoryId: data.categoryId || null,
      date: data.date,
      isPaid: data.isPaid,
      paidAt: data.isPaid ? data.paidAt ?? data.date : null,
    };
    try {
      if (isEdit && initial) {
        await update.mutateAsync({ id: initial.id, ...payload });
        toast.success("Lançamento atualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Lançamento criado");
      }
      onOpenChange(false);
    } catch {
      toast.error("Falha ao salvar lançamento");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-2xl md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar lançamento" : "Novo lançamento"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Atualize os dados deste lançamento." : "Registre uma receita ou despesa."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <FormField label="Descrição" htmlFor="description" error={errors.description?.message} required>
            <Input
              id="description"
              autoFocus
              autoComplete="off"
              invalid={!!errors.description}
              {...register("description")}
            />
          </FormField>

          <FormField label="Valor" error={errors.amount?.message} required>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <MoneyInput
                  value={field.value}
                  onValueChange={(v) => field.onChange(v ?? 0)}
                  invalid={!!errors.amount}
                />
              )}
            />
          </FormField>

          <FormField label="Categoria">
            <Select
              value={categoryId}
              onValueChange={(v) => setValue("categoryId", v || null, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Cadastre categorias primeiro
                  </div>
                ) : (
                  categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color ?? "#94a3b8" }}
                        />
                        {c.name}
                        <span className="text-xs text-muted-foreground">
                          {c.type === 1 ? "Receita" : "Despesa"}
                        </span>
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Data" htmlFor="date" error={errors.date?.message} required>
            <Input id="date" type="date" invalid={!!errors.date} {...register("date")} />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Lançamento pago</p>
              <p className="text-xs text-muted-foreground">
                Marca este lançamento como já efetivado.
              </p>
            </div>
            <Controller
              control={control}
              name="isPaid"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {isPaid ? (
            <FormField label="Pago em" htmlFor="paidAt">
              <Input id="paidAt" type="date" {...register("paidAt")} />
            </FormField>
          ) : null}

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

