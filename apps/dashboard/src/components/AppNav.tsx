import {
  Home,
  ArrowLeftRight,
  Tags,
  Repeat,
  Settings,
  Inbox,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell,
  BottomTabBar,
  type BottomTabItem,
  cn,
} from "@vestra/ui";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMyInvites } from "../api/hooks/useInvites";
import { NotificationBell } from "./NotificationBell";
import { TourPopover } from "./onboarding/TourPopover";
import { useTourStep, type TourStepHandle } from "./onboarding/useTourStep";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

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

interface NavTour {
  step: number;
  title: string;
  subtitle: string;
  actionLabel: string;
  href: string;
  handle: TourStepHandle;
}

const NAV_TOUR_BY_KEY: Record<string, Omit<NavTour, "handle">> = {
  categories: {
    step: 3,
    title: "Crie sua primeira categoria",
    subtitle:
      "As categorias são usadas para identificar e organizar seus lançamentos.",
    actionLabel: "Ir para Categorias",
    href: "/categories",
  },
  recurring: {
    step: 4,
    title: "Crie sua primeira recorrência",
    subtitle:
      "Recorrências cadastram lançamentos que se repetem periodicamente.",
    actionLabel: "Ir para Recorrências",
    href: "/recurring",
  },
  transactions: {
    step: 5,
    title: "Confira seus lançamentos",
    subtitle:
      "Acompanhe os lançamentos do seu workspace e marque os pagos.",
    actionLabel: "Ir para Lançamentos",
    href: "/transactions",
  },
};

function activeKey(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "home";
  if (pathname.startsWith("/transactions")) return "transactions";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/recurring")) return "recurring";
  if (pathname.startsWith("/invites")) return "invites";
  if (pathname.startsWith("/settings")) return "settings";
  return "home";
}

interface SidebarProps {
  active: string;
  invitesCount: number;
  navTours: Record<string, NavTour>;
  onTourAction: (tour: NavTour) => void;
  enableTours: boolean;
}

function Sidebar({
  active,
  invitesCount,
  navTours,
  onTourAction,
  enableTours,
}: SidebarProps) {
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
        const link = (
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

        const tour = navTours[t.key];
        if (enableTours && tour && tour.handle.active) {
          return (
            <TourPopover
              key={t.key}
              open
              onClose={tour.handle.dismiss}
              title={tour.title}
              subtitle={tour.subtitle}
              actionLabel={tour.actionLabel}
              onAction={() => onTourAction(tour)}
              side="right"
            >
              {link}
            </TourPopover>
          );
        }
        return link;
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
  const navigate = useNavigate();
  const active = activeKey(pathname);
  const invites = useMyInvites();
  const pending = invites.data?.length ?? 0;
  const isDesktop = useIsDesktop();

  const categoriesTour = useTourStep(NAV_TOUR_BY_KEY.categories!.step);
  const recurringTour = useTourStep(NAV_TOUR_BY_KEY.recurring!.step);
  const transactionsTour = useTourStep(NAV_TOUR_BY_KEY.transactions!.step);

  const navTours: Record<string, NavTour> = {
    categories: { ...NAV_TOUR_BY_KEY.categories!, handle: categoriesTour },
    recurring: { ...NAV_TOUR_BY_KEY.recurring!, handle: recurringTour },
    transactions: { ...NAV_TOUR_BY_KEY.transactions!, handle: transactionsTour },
  };

  const handleNavTourAction = (tour: NavTour) => {
    tour.handle.dismiss();
    navigate(tour.href);
  };

  // Mobile bottom bar still has 5 slots — show invite count on Settings tab.
  const mobileTabs: BottomTabItem[] = baseTabs.map((t) =>
    t.key === "settings" && pending > 0 ? { ...t, badge: pending } : t,
  );

  return (
    <AppShell
      sidebar={
        <Sidebar
          active={active}
          invitesCount={pending}
          navTours={navTours}
          onTourAction={handleNavTourAction}
          enableTours={isDesktop}
        />
      }
      topBar={withBell(topBar)}
      bottomBar={
        <BottomTabBar
          items={mobileTabs}
          active={active}
          asLink={(item) => {
            const link = (
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
            );

            const tour = navTours[item.key];
            if (!isDesktop && tour && tour.handle.active) {
              return (
                <TourPopover
                  open
                  onClose={tour.handle.dismiss}
                  title={tour.title}
                  subtitle={tour.subtitle}
                  actionLabel={tour.actionLabel}
                  onAction={() => handleNavTourAction(tour)}
                  side="top"
                >
                  {link}
                </TourPopover>
              );
            }
            return link;
          }}
        />
      }
    >
      {children}
    </AppShell>
  );
}
