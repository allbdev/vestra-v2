import { useState } from "react";
import { Plus, Repeat, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Fab,
  PageSkeleton,
  Switch,
  TopBar,
  toast,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import {
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from "../../api/hooks/useTemplates";
import { TemplateFormSheet } from "../../components/sheets/TemplateFormSheet";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { useAuth } from "../../auth/AuthProvider";
import { formatMoney } from "../../lib/format";
import { toNumber, type TransactionTemplate } from "../../api/types";

const FREQ_LABEL: Record<number, string> = {
  1: "Diário",
  2: "Semanal",
  3: "Mensal",
  4: "Anual",
};

export function RecurringPage() {
  const { active } = useWorkspace();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TransactionTemplate | null>(null);
  const [deleting, setDeleting] = useState<TransactionTemplate | null>(null);
  const workspaceId = active?.id ?? "";
  const list = useTemplates(workspaceId || null);
  const update = useUpdateTemplate(workspaceId);
  const del = useDeleteTemplate(workspaceId);

  return (
    <AppNavShell topBar={<TopBar title="Recorrências" />}>
      <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
        {!active ? (
          <EmptyState
            icon={Repeat}
            title="Selecione um workspace"
            description="Vá em Ajustes e crie ou selecione um workspace."
          />
        ) : list.isLoading ? (
          <PageSkeleton />
        ) : list.error ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.data?.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Sem recorrências"
            description="Crie modelos de recorrência para gerar lançamentos automaticamente."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Nova recorrência
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {list.data?.map((t) => {
              const isOwner = t.ownerId === user?.id;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: t.category?.color ?? "#94a3b8" }}
                    aria-hidden
                  >
                    {(t.category?.name ?? t.description).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{t.description}</p>
                      {!t.active ? (
                        <Badge variant="muted">Pausada</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.category?.name ?? "Sem categoria"} ·{" "}
                      {t.frequency ? FREQ_LABEL[t.frequency] : "—"}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">
                      {formatMoney(toNumber(t.baseAmount))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOwner ? (
                      <Switch
                        checked={t.active}
                        onCheckedChange={async (v) => {
                          try {
                            await update.mutateAsync({ id: t.id, active: v });
                            toast.success(v ? "Recorrência ativada" : "Recorrência pausada");
                          } catch {
                            toast.error("Falha ao atualizar");
                          }
                        }}
                        aria-label={t.active ? "Pausar" : "Ativar"}
                      />
                    ) : null}
                    {isOwner ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(t)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDeleting(t)}>
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active ? (
        <>
          <Fab onClick={() => setCreating(true)} aria-label="Nova recorrência">
            <Plus />
          </Fab>
          <TemplateFormSheet
            open={creating}
            onOpenChange={setCreating}
            workspaceId={active.id}
          />
          <TemplateFormSheet
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            workspaceId={active.id}
            initial={editing}
          />
          <ConfirmDelete
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title="Excluir recorrência?"
            description={
              deleting
                ? `"${deleting.description}" será removida. Lançamentos já criados não serão afetados.`
                : ""
            }
            loading={del.isPending}
            onConfirm={async () => {
              if (!deleting) return;
              try {
                await del.mutateAsync(deleting.id);
                toast.success("Recorrência excluída");
                setDeleting(null);
              } catch {
                toast.error("Falha ao excluir");
              }
            }}
          />
        </>
      ) : null}
    </AppNavShell>
  );
}
