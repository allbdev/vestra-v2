import { Check, Inbox, X } from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorState,
  PageSkeleton,
  TopBar,
  toast,
} from "@vestra/ui";
import { AppNavShell } from "../../components/AppNav";
import {
  useAcceptInvite,
  useMyInvites,
  useRejectInvite,
} from "../../api/hooks/useInvites";

export function InvitesPage() {
  const list = useMyInvites();
  const accept = useAcceptInvite();
  const reject = useRejectInvite();

  return (
    <AppNavShell topBar={<TopBar title="Convites" />}>
      <div className="mx-auto max-w-2xl px-4 py-4 md:px-6 md:py-6">
        {list.isLoading ? (
          <PageSkeleton />
        ) : list.error ? (
          <ErrorState onRetry={() => list.refetch()} />
        ) : !list.data || list.data.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Sem convites pendentes"
            description="Convites de workspaces aparecerão aqui."
          />
        ) : (
          <ul className="space-y-2">
            {list.data.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.workspace?.name ?? "Workspace"}</p>
                  <p className="text-xs text-muted-foreground">
                    Convite recebido em {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={reject.isPending && reject.variables === inv.id}
                    onClick={async () => {
                      try {
                        await reject.mutateAsync(inv.id);
                        toast.success("Convite recusado");
                      } catch {
                        toast.error("Falha ao recusar");
                      }
                    }}
                  >
                    <X className="h-4 w-4" /> Recusar
                  </Button>
                  <Button
                    size="sm"
                    loading={accept.isPending && accept.variables === inv.id}
                    onClick={async () => {
                      try {
                        await accept.mutateAsync(inv.id);
                        toast.success(`Bem-vindo a ${inv.workspace?.name ?? "novo workspace"}`);
                      } catch {
                        toast.error("Falha ao aceitar");
                      }
                    }}
                  >
                    <Check className="h-4 w-4" /> Aceitar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppNavShell>
  );
}
