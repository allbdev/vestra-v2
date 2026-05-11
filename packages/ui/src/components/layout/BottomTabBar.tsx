import type { ComponentType, ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface BottomTabItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  iconActive?: ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  badge?: ReactNode;
}

export interface BottomTabBarProps {
  items: BottomTabItem[];
  active: string;
  /** Render as a router link when provided; click handler still fires. */
  asLink?: (item: BottomTabItem) => ReactNode;
  className?: string;
}

/**
 * Mobile primary navigation. 5 slots max. Safe-area aware bottom padding.
 * Hidden on `lg+`. Pair with a sidebar at that breakpoint.
 */
export function BottomTabBar({ items, active, asLink, className }: BottomTabBarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md pb-safe lg:hidden",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {items.map((item) => {
          const isActive = item.key === active;
          const Icon = isActive ? item.iconActive ?? item.icon : item.icon;
          const inner = (
            <span
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2",
                "min-h-14 text-xs",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
              {item.badge ? (
                <span className="absolute right-1/2 top-1 translate-x-3 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {item.badge}
                </span>
              ) : null}
            </span>
          );

          return (
            <li key={item.key} className="flex flex-1 items-stretch">
              {asLink ? (
                asLink(item)
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-stretch"
                  aria-current={isActive ? "page" : undefined}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
