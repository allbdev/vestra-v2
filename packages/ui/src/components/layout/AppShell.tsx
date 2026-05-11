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
 * App shell pattern: the whole viewport is the chrome, `<main>` is the only
 * scrollable region.
 *
 * - Outer is `h-dvh overflow-hidden` so the document body never scrolls.
 * - Sidebar (lg+) is a sibling column inside the same h-dvh row — it stays
 *   pinned because its column doesn't scroll, not because of sticky/fixed.
 * - Right column: TopBar (`shrink-0`) at top, scrollable `<main>` in the
 *   middle, BottomBar (`shrink-0`, mobile only) at bottom.
 *
 * Children render inside the scrollable main. `min-w-0` is set on every
 * flex child so wide content (charts, long names) can't push siblings out.
 */
export function AppShell({ topBar, bottomBar, sidebar, children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "flex h-dvh w-full overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {sidebar ? (
        <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-card pt-safe lg:flex">
          {sidebar}
        </aside>
      ) : null}
      <div className="flex h-dvh min-w-0 flex-1 flex-col">
        {topBar ? <div className="shrink-0">{topBar}</div> : null}
        <main className="min-w-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
        {bottomBar ? <div className="shrink-0 lg:hidden">{bottomBar}</div> : null}
      </div>
    </div>
  );
}
