import { Bell } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
  Switch,
  toast,
} from "@vestra/ui";
import { usePushSubscription } from "../notifications/usePushSubscription";
import {
  useSetWorkspaceNotificationPref,
  useWorkspaceNotificationPrefs,
} from "../api/hooks/useNotifications";
import { useWorkspace } from "../workspace/WorkspaceProvider";

export function NotificationsSettingsCard() {
  const { supported, permission, subscribed, busy, enable, disable, vapidConfigured } =
    usePushSubscription();
  const { workspaces } = useWorkspace();
  const prefsQuery = useWorkspaceNotificationPrefs();
  const setPref = useSetWorkspaceNotificationPref();
  const mutedById = new Map(
    (prefsQuery.data ?? []).map((p) => [p.workspaceId, p.muted]),
  );

  const handleToggleWorkspace = async (workspaceId: string, enabled: boolean) => {
    try {
      await setPref.mutateAsync({ workspaceId, muted: !enabled });
    } catch {
      toast.error("Não foi possível atualizar");
    }
  };

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const ok = await enable();
      if (!ok) {
        toast.error(
          permission === "denied"
            ? "Permissão negada. Habilite nas configurações do navegador."
            : "Não foi possível ativar notificações.",
        );
      } else {
        toast.success("Notificações ativadas");
      }
    } else {
      await disable();
      toast.success("Notificações desativadas");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notificações
        </CardTitle>
        <CardDescription>
          Receba avisos de pagamentos a vencer no seu dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            Seu navegador não suporta notificações push. No iOS, adicione o app à tela inicial
            (Compartilhar → Adicionar à Tela de Início) para habilitar.
          </p>
        ) : !vapidConfigured ? (
          <p className="text-sm text-muted-foreground">
            Notificações push não configuradas no servidor.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Notificações no dispositivo</p>
                <p className="text-xs text-muted-foreground">
                  {permission === "denied"
                    ? "Permissão bloqueada no navegador."
                    : subscribed
                      ? "Ativadas neste dispositivo."
                      : "Desativadas neste dispositivo."}
                </p>
              </div>
              <Switch
                checked={subscribed}
                disabled={busy || permission === "denied"}
                onCheckedChange={handleToggle}
                aria-label="Ativar notificações"
              />
            </div>
            {permission === "denied" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.info(
                    "Abra as configurações do site no navegador e permita notificações.",
                  )
                }
                className="w-full"
              >
                Como desbloquear
              </Button>
            ) : null}
          </>
        )}

        {workspaces.length > 0 ? (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Por workspace</p>
              <p className="text-xs text-muted-foreground">
                Desative para parar de receber avisos de pagamentos de um workspace específico.
              </p>
              {prefsQuery.isLoading ? (
                <div className="space-y-2 pt-1">
                  {Array.from({ length: Math.min(workspaces.length, 3) }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {workspaces.map((w) => {
                    const muted = mutedById.get(w.id) ?? false;
                    return (
                      <li
                        key={w.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">{w.name}</span>
                        <Switch
                          checked={!muted}
                          disabled={setPref.isPending}
                          onCheckedChange={(checked) =>
                            handleToggleWorkspace(w.id, checked)
                          }
                          aria-label={`Notificações para ${w.name}`}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
