import {
  Home,
  ArrowLeftRight,
  Tags,
  Repeat,
  Settings,
  Inbox,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  AppShell,
  BottomTabBar,
  type BottomTabItem,
  cn,
} from "@vestra/ui";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { useMyInvites } from "../api/hooks/useInvites";
import { NotificationBell } from "./NotificationBell";

interface TopBarPropsLike {
  trailing?: ReactNode;
}

function withBell(topBar: ReactNode): ReactNode {
  if (!topBar) {
    return null;
  }
  if (!isValidElement(topBar)) {
    return (
      <div className="flex items-center">
        <div className="min-w-0 flex-1">{topBar}</div>
        <div className="px-2">
          <NotificationBell />
        </div>
      </div>
    );
  }
  const el = topBar as ReactElement<TopBarPropsLike>;
  const existing = el.props.trailing;
  return cloneElement(el, {
    trailing: (
      <>
        {existing}
        <NotificationBell />
      </>
    ),
  });
}

const baseTabs: BottomTabItem[] = [
  { key: "home", label: "Início", icon: Home, href: "/" },
  { key: "transactions", label: "Lançamentos", icon: ArrowLeftRight, href: "/transactions" },
  { key: "categories", label: "Categorias", icon: Tags, href: "/categories" },
  { key: "recurring", label: "Recorrências", icon: Repeat, href: "/recurring" },
  { key: "settings", label: "Ajustes", icon: Settings, href: "/settings" },
];

function activeKey(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/transactions")) return "transactions";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/recurring")) return "recurring";
  if (pathname.startsWith("/invites")) return "invites";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}

function Sidebar({
  active,
  invitesCount,
}: {
  active: string;
  invitesCount: number;
}) {
  const sidebarTabs: BottomTabItem[] = [
    ...baseTabs.slice(0, 4),
    {
      key: "invites",
      label: "Convites",
      icon: Inbox,
      href: "/invites",
      badge: invitesCount > 0 ? invitesCount : undefined,
    },
    baseTabs[4]!,
  ];
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 p-4">
      <div className="mb-2 px-2 text-lg font-semibold text-primary">Vestra</div>
      {sidebarTabs.map((t) => {
        const Icon = t.icon;
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            to={t.href!}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate">{t.label}</span>
            {t.badge ? (
              <span className="rounded-full bg-destructive px-2 text-[10px] font-semibold text-destructive-foreground">
                {t.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNavShell({
  topBar,
  children,
}: {
  topBar?: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();
  const active = activeKey(pathname);
  const invites = useMyInvites();
  const pending = invites.data?.length ?? 0;

  // Mobile bottom bar still has 5 slots — show invite count on Settings tab.
  const mobileTabs: BottomTabItem[] = baseTabs.map((t) =>
    t.key === "settings" && pending > 0 ? { ...t, badge: pending } : t,
  );

  return (
    <AppShell
      sidebar={<Sidebar active={active} invitesCount={pending} />}
      topBar={withBell(topBar)}
      bottomBar={
        <BottomTabBar
          items={mobileTabs}
          active={active}
          asLink={(item) => (
            <Link
              to={item.href!}
              className="flex w-full items-stretch"
              aria-current={item.key === active ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-14 text-xs",
                  item.key === active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", item.key === active && "stroke-[2.5]")} />
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
                {item.badge ? (
                  <span className="absolute right-1/2 top-1 translate-x-3 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            </Link>
          )}
        />
      }
    >
      {children}
    </AppShell>
  );
}
