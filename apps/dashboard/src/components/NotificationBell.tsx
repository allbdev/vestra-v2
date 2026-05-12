import { Bell, BellOff, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DateDisplay,
  Sheet,
  SheetContent,
  SheetTitle,
  Skeleton,
  cn,
} from "@vestra/ui";
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from "../api/hooks/useNotifications";
import { useWorkspace } from "../workspace/WorkspaceProvider";
import type { NotificationDto } from "@vestra/types";

function relativeTime(iso: string): string | null {
  const created = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (diffSec < 60) return "agora";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return null;
}

function NotificationRow({
  n,
  onClick,
}: {
  n: NotificationDto;
  onClick: (n: NotificationDto) => void;
}) {
  const rel = relativeTime(n.createdAt);
  const data = n.data as { workspaceName?: string } | null;
  const workspaceName = data?.workspaceName;
  return (
    <button
      type="button"
      onClick={() => onClick(n)}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors touch-manipulation",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        n.readAt ? "border-border bg-card" : "border-primary/30 bg-accent/40",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          n.readAt ? "bg-muted-foreground/30" : "bg-primary",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-medium">{n.title}</p>
          <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
            {rel ?? <DateDisplay date={n.createdAt} />}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
        {workspaceName ? (
          <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
            <span className="truncate">{workspaceName}</span>
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();

  const { active, workspaces, setActive } = useWorkspace();

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const count = unread.data ?? 0;

  const onItem = (n: NotificationDto) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    const data = n.data as
      | { transactionId?: string; workspaceId?: string }
      | null;
    const tid = data?.transactionId;
    const wid = data?.workspaceId;
    if (wid && wid !== active?.id && workspaces.some((w) => w.id === wid)) {
      setActive(wid);
    }
    if (tid) navigate(`/transactions/${tid}`);
    else navigate("/transactions");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notificações"
        onClick={() => setOpen(true)}
        className="relative min-h-11 min-w-11"
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          hideClose
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <SheetTitle className="flex-1 truncate text-base">Notificações</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              disabled={count === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
              className="h-9 gap-1.5 text-xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Marcar todas</span>
              <span className="sm:hidden">Todas</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="min-h-11 min-w-11"
            >
              <X className="h-5 w-5" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {list.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <BellOff className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Sem notificações</p>
                <p className="text-xs text-muted-foreground">
                  Você verá aqui avisos de pagamentos a vencer.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((n) => (
                  <NotificationRow key={n.id} n={n} onClick={onItem} />
                ))}
                {list.hasNextPage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => list.fetchNextPage()}
                    disabled={list.isFetchingNextPage}
                    className="w-full"
                  >
                    {list.isFetchingNextPage ? "Carregando..." : "Carregar mais"}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
