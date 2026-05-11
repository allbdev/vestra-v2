import { useState } from "react";
import { Plus, Tags, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Fab,
  PageSkeleton,
  TopBar,
  toast,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import { useWorkspace } from "../../workspace/WorkspaceProvider";
import {
  useCategories,
  useDeleteCategory,
} from "../../api/hooks/useCategories";
import { CategoryFormSheet } from "../../components/sheets/CategoryFormSheet";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { useAuth } from "../../auth/AuthProvider";
import type { Category } from "../../api/types";

export function CategoriesPage() {
  const { active } = useWorkspace();
  const { user } = useAuth();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const workspaceId = active?.id ?? "";
  const list = useCategories(workspaceId || null);
  const del = useDeleteCategory(workspaceId);

  return (
    <AppNavShell topBar={<TopBar title="Categorias" />}>
      <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
        {!active ? (
          <EmptyState
            icon={Tags}
            title="Selecione um workspace"
            description="Vá em Ajustes e crie ou selecione um workspace."
          />
        ) : list.isLoading ? (
          <PageSkeleton />
        ) : list.error ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : list.data?.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Sem categorias"
            description="Crie sua primeira categoria para começar."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Nova categoria
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {list.data?.map((c) => {
              const isOwner = c.ownerId === user?.id;
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: c.color ?? "#94a3b8" }}
                    aria-hidden
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.type === 1 ? "Receita" : "Despesa"}
                      {c.owner ? ` · ${c.owner.name ?? c.owner.email}` : ""}
                    </p>
                  </div>
                  {isOwner ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(c)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleting(c)}>
                          <Trash2 className="h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active ? (
        <>
          <Fab onClick={() => setCreating(true)} aria-label="Nova categoria">
            <Plus />
          </Fab>
          <CategoryFormSheet
            open={creating}
            onOpenChange={setCreating}
            workspaceId={active.id}
          />
          <CategoryFormSheet
            open={!!editing}
            onOpenChange={(o) => !o && setEditing(null)}
            workspaceId={active.id}
            initial={editing}
          />
          <ConfirmDelete
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title="Excluir categoria?"
            description={
              deleting
                ? `"${deleting.name}" será removida. Categorias em uso não podem ser excluídas.`
                : ""
            }
            loading={del.isPending}
            onConfirm={async () => {
              if (!deleting) return;
              try {
                await del.mutateAsync(deleting.id);
                toast.success("Categoria excluída");
                setDeleting(null);
              } catch {
                toast.error("Não foi possível excluir. Está em uso?");
              }
            }}
          />
        </>
      ) : null}
    </AppNavShell>
  );
}
