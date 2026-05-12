import { useState } from "react";
import {
  LogOut,
  Moon,
  Sun,
  Monitor,
  User,
  Plus,
  Pencil,
  Trash2,
  Users,
  Inbox,
  Copy,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FormField,
  Input,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  TopBar,
  toast,
  useTheme,
} from "@vestra/ui";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AppNavShell } from "../../components/AppNav";
import { useAuth } from "../../auth/AuthProvider";
import { useWorkspace, type WorkspaceSummary } from "../../workspace/WorkspaceProvider";
import {
  useCloneWorkspace,
  useDeleteWorkspace,
  useRenameWorkspace,
} from "../../api/hooks/useWorkspaces";
import { AxiosError } from "axios";
import { WorkspaceCreateSheet } from "../../components/sheets/WorkspaceCreateSheet";
import { WorkspaceMembersSheet } from "../../components/sheets/WorkspaceMembersSheet";
import { ConfirmDelete } from "../../components/ConfirmDelete";
import { useMyInvites } from "../../api/hooks/useInvites";

const renameSchema = yup.object({
  name: yup.string().required("Nome obrigatório").max(255),
});

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { workspaces, active, setActive } = useWorkspace();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<WorkspaceSummary | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceSummary | null>(null);
  const [managing, setManaging] = useState<WorkspaceSummary | null>(null);
  const renameMut = useRenameWorkspace();
  const deleteMut = useDeleteWorkspace();
  const cloneMut = useCloneWorkspace();

  const handleClone = async (workspace: WorkspaceSummary) => {
    try {
      const ws = await cloneMut.mutateAsync(workspace.id);
      setActive(ws.id);
      toast.success(`Workspace duplicado como "${ws.name}"`);
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.status === 403
          ? "Limite do plano atingido. Faça upgrade para Pro."
          : "Falha ao duplicar workspace";
      toast.error(msg);
    }
  };
  const invites = useMyInvites();
  const pendingInvites = invites.data?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    toast.success("Sessão encerrada");
    navigate("/login", { replace: true });
  };

  return (
    <AppNavShell topBar={<TopBar title="Ajustes" />}>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 md:px-6 md:py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" /> Perfil
            </CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{user?.name ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>Crie, renomeie ou exclua.</CardDescription>
            </div>
            <Button onClick={() => setCreating(true)} size="sm">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {workspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum workspace. Crie o primeiro para começar.
              </p>
            ) : (
              workspaces.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setActive(w.id)}
                    className={`flex-1 truncate text-left text-sm ${
                      active?.id === w.id ? "font-medium text-primary" : ""
                    }`}
                  >
                    {w.name}
                    {w.isOwner ? (
                      <span className="ml-2 text-xs text-muted-foreground">Owner</span>
                    ) : null}
                    {active?.id === w.id ? (
                      <span className="ml-2 text-xs text-muted-foreground">Ativo</span>
                    ) : null}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações do workspace">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setManaging(w)}>
                        <Users className="h-4 w-4" /> Membros
                      </DropdownMenuItem>
                      {w.isOwner ? (
                        <>
                          <DropdownMenuItem onSelect={() => setRenaming(w)}>
                            <Pencil className="h-4 w-4" /> Renomear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={cloneMut.isPending}
                            onSelect={() => handleClone(w)}
                          >
                            <Copy className="h-4 w-4" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDeleting(w)}>
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Link
          to="/invites"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Convites recebidos</span>
          </span>
          {pendingInvites > 0 ? (
            <span className="rounded-full bg-destructive px-2 text-xs font-semibold text-destructive-foreground">
              {pendingInvites}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Nenhum</span>
          )}
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="flex-1"
            >
              <Sun className="h-4 w-4" /> Claro
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="flex-1"
            >
              <Moon className="h-4 w-4" /> Escuro
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("system")}
              className="flex-1"
            >
              <Monitor className="h-4 w-4" /> Auto
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <Button variant="destructive" onClick={handleLogout} className="w-full" size="lg">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <WorkspaceCreateSheet open={creating} onOpenChange={setCreating} />
      {managing ? (
        <WorkspaceMembersSheet
          open={!!managing}
          onOpenChange={(o) => !o && setManaging(null)}
          workspace={managing}
        />
      ) : null}
      <RenameSheet
        target={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (name) => {
          if (!renaming) return;
          await renameMut.mutateAsync({ id: renaming.id, name });
          toast.success("Workspace renomeado");
          setRenaming(null);
        }}
      />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir workspace?"
        description={
          deleting
            ? `"${deleting.name}" e todos os seus lançamentos serão removidos. Esta ação não pode ser desfeita.`
            : ""
        }
        loading={deleteMut.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteMut.mutateAsync(deleting.id);
            toast.success("Workspace excluído");
            setDeleting(null);
          } catch {
            toast.error("Falha ao excluir");
          }
        }}
      />
    </AppNavShell>
  );
}

function RenameSheet({
  target,
  onClose,
  onSave,
}: {
  target: WorkspaceSummary | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({
    resolver: yupResolver(renameSchema),
    values: target ? { name: target.name } : undefined,
  });

  return (
    <Sheet
      open={!!target}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          reset();
        }
      }}
    >
      <SheetContent side="bottom" className="max-w-lg md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>Renomear workspace</SheetTitle>
          <SheetDescription>Visível para todos os membros.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit((d) => onSave(d.name))} className="mt-4 space-y-4" noValidate>
          <FormField label="Nome" htmlFor="rename" error={errors.name?.message} required>
            <Input id="rename" autoFocus invalid={!!errors.name} {...register("name")} />
          </FormField>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
