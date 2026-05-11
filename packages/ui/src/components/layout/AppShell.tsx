import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface AppShellProps {
  topBar?: ReactNode;
  bottomBar?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-first shell. Stacks top bar + scrollable content + bottom tab bar.
 * On `lg+`, slots a persistent sidebar to the left and hides the bottom bar.
 * Reserves space for the fixed bottom bar via `pb-20` so content isn't covered.
 */
export function AppShell({ topBar, bottomBar, sidebar, children, className }: AppShellProps) {
  return (
    <div className={cn("min-h-dvh bg-background text-foreground", className)}>
      <div className="flex">
        {sidebar ? (
          <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-card pt-safe lg:flex lg:flex-col">
            {sidebar}
          </aside>
        ) : null}
        <div className="flex min-h-dvh flex-1 flex-col">
          {topBar}
          <main className={cn("flex-1", bottomBar ? "pb-20 lg:pb-0" : "")}>{children}</main>
          {bottomBar}
        </div>
      </div>
    </div>
  );
}
