import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Crown, Mail, Trash2, UserPlus } from "lucide-react";
import { AxiosError } from "axios";
import {
  Badge,
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
import {
  useRemoveWorkspaceMember,
  useWorkspaceMembers,
} from "../../api/hooks/useWorkspaceMembers";
import {
  useInviteByEmail,
  useWorkspaceInvites,
} from "../../api/hooks/useInvites";
import { ConfirmDelete } from "../ConfirmDelete";
import { useAuth } from "../../auth/AuthProvider";
import type { WorkspaceSummary } from "../../workspace/WorkspaceProvider";

const inviteSchema = yup.object({
  email: yup.string().email("E-mail inválido").required("E-mail obrigatório"),
});
type InviteFormData = yup.InferType<typeof inviteSchema>;

export interface WorkspaceMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: WorkspaceSummary;
}

export function WorkspaceMembersSheet({
  open,
  onOpenChange,
  workspace,
}: WorkspaceMembersSheetProps) {
  const { user } = useAuth();
  const members = useWorkspaceMembers(workspace.id);
  const invites = useWorkspaceInvites(workspace.id);
  const invite = useInviteByEmail(workspace.id);
  const remove = useRemoveWorkspaceMember(workspace.id);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    resolver: yupResolver(inviteSchema) as never,
    defaultValues: { email: "" },
  });

  const onInvite = async (data: InviteFormData) => {
    try {
      await invite.mutateAsync(data.email);
      toast.success("Convite enviado");
      reset();
    } catch (err) {
      const msg =
        err instanceof AxiosError
          ? err.response?.status === 403
            ? "Limite do plano atingido"
            : err.response?.status === 404
              ? "E-mail não cadastrado no Vestra"
              : err.response?.status === 409
                ? "Convite já existe ou usuário já é membro"
                : "Falha ao convidar"
          : "Falha ao convidar";
      toast.error(msg);
    }
  };

  const pendingInvites = invites.data?.filter((i) => i.status === "waiting") ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-w-xl md:mx-auto md:rounded-2xl">
        <SheetHeader>
          <SheetTitle>{workspace.name}</SheetTitle>
          <SheetDescription>Gerencie membros e convites.</SheetDescription>
        </SheetHeader>

        {workspace.isOwner ? (
          <form onSubmit={handleSubmit(onInvite)} className="mt-4 space-y-2" noValidate>
            <FormField
              label="Convidar por e-mail"
              htmlFor="invite-email"
              error={errors.email?.message}
            >
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  placeholder="usuario@exemplo.com"
                  invalid={!!errors.email}
                  {...register("email")}
                />
                <Button type="submit" loading={isSubmitting} aria-label="Enviar convite">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </FormField>
          </form>
        ) : null}

        <div className="mt-4 space-y-3">
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Membros
            </h3>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {members.data?.length ? (
                members.data.map((m) => {
                  const isWorkspaceOwner = m.userId === workspace.ownerId;
                  const isSelf = m.userId === user?.id;
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {m.user.name ?? m.user.email}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                      </div>
                      {isWorkspaceOwner ? (
                        <Badge variant="outline" className="gap-1">
                          <Crown className="h-3 w-3" /> Owner
                        </Badge>
                      ) : null}
                      {!isWorkspaceOwner && (workspace.isOwner || isSelf) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover"
                          onClick={() =>
                            setRemoving({ id: m.userId, name: m.user.name ?? m.user.email })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-3 text-sm text-muted-foreground">Sem membros.</li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Convites pendentes
            </h3>
            {pendingInvites.length === 0 ? (
              <p className="rounded-xl border border-border px-3 py-3 text-sm text-muted-foreground">
                Nenhum convite pendente.
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">
                      {inv.user?.email ?? "convite"}
                    </span>
                    <Badge variant="muted">Aguardando</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <ConfirmDelete
          open={!!removing}
          onOpenChange={(o) => !o && setRemoving(null)}
          title="Remover membro?"
          description={
            removing ? `${removing.name} perderá acesso ao workspace.` : ""
          }
          confirmLabel="Remover"
          loading={remove.isPending}
          onConfirm={async () => {
            if (!removing) return;
            try {
              await remove.mutateAsync(removing.id);
              toast.success("Membro removido");
              setRemoving(null);
            } catch {
              toast.error("Falha ao remover");
            }
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
