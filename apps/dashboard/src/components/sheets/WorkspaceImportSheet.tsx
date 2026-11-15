import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AxiosError } from "axios";
import { WORKSPACE_EXPORT_FORMAT } from "@vestra/types";
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
import { useImportWorkspace } from "../../api/hooks/useWorkspaces";
import { useWorkspace } from "../../workspace/WorkspaceProvider";

const MAX_BYTES = 20 * 1024 * 1024;

const schema = yup.object({
  file: yup
    .mixed<FileList>()
    .test("required", "Selecione um arquivo", (v) => !!v && v.length > 0)
    .test("json", "Use um arquivo .json exportado do Vestra", (v) =>
      !v?.[0] ? true : v[0].name.toLowerCase().endsWith(".json"),
    )
    .test("size", "Arquivo muito grande (máx. 20 MB)", (v) =>
      !v?.[0] ? true : v[0].size <= MAX_BYTES,
    )
    .required("Selecione um arquivo"),
});
type FormData = yup.InferType<typeof schema>;

function apiErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    if (status === 403) return "Limite do plano atingido. Faça upgrade para Pro.";
    if (status === 413) return "Arquivo muito grande para importar.";
    if (status === 400) {
      const msg = (err.response?.data as { message?: string | string[] } | undefined)?.message;
      const first = Array.isArray(msg) ? msg[0] : msg;
      return first ? `Arquivo inválido: ${first}` : "Arquivo inválido.";
    }
  }
  return "Falha ao importar. Tente novamente.";
}

export interface WorkspaceImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceImportSheet({ open, onOpenChange }: WorkspaceImportSheetProps) {
  const importMut = useImportWorkspace();
  const { setActive } = useWorkspace();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormData>({ resolver: yupResolver(schema), mode: "onChange" });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const onSubmit = async ({ file }: FormData) => {
    const picked = file[0];
    if (!picked) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await picked.text());
    } catch {
      setError("file", { message: "Não foi possível ler o arquivo (JSON inválido)" });
      return;
    }
    if ((parsed as { format?: unknown } | null)?.format !== WORKSPACE_EXPORT_FORMAT) {
      setError("file", { message: "Este arquivo não é uma exportação do Vestra" });
      return;
    }

    try {
      const result = await importMut.mutateAsync(parsed);
      setActive(result.workspace.id);
      const { categories, templates, transactions } = result.counts;
      toast.success(`"${result.workspace.name}" importado`, {
        description: `${transactions} lançamentos, ${templates} recorrências, ${categories} categorias`,
      });
      onOpenChange(false);
    } catch (err) {
      setError("file", { message: apiErrorMessage(err) });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-lg md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>Importar workspace</SheetTitle>
          <SheetDescription>
            Escolha um arquivo exportado do Vestra. Ele será restaurado como um novo workspace, com
            categorias, recorrências e lançamentos.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
          <FormField label="Arquivo" htmlFor="import-file" error={errors.file?.message} required>
            <Input
              id="import-file"
              type="file"
              accept="application/json,.json"
              invalid={!!errors.file}
              className="cursor-pointer py-3 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
              {...register("file")}
            />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
              Importar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
