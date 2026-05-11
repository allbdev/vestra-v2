import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";

export interface TopBarProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  /** Render the bar as the page hero (larger title, taller bar) when true. */
  large?: boolean;
}

/**
 * Top bar. Sits as a `shrink-0` flex child of the AppShell column —
 * the column doesn't scroll, so this stays pinned without `position: sticky`.
 * Safe-area aware via `pt-safe`.
 *
 * Two layouts share one row of flex children so the title can shrink and
 * `truncate` correctly even on wide viewports. `large` only changes typography,
 * padding and height — not the structure — to avoid the wide-viewport bug
 * where a column-flex container with `items-start` makes the title section
 * content-sized and disables truncation.
 */
export function TopBar({
  title,
  subtitle,
  onBack,
  leading,
  trailing,
  className,
  large,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "z-40 border-b border-border bg-background/85 backdrop-blur-md pt-safe",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center gap-2 px-4",
          large ? "min-h-20 py-4 md:min-h-24 md:py-5" : "h-14 md:h-16",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading ??
            (onBack ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                aria-label="Voltar"
                className="-ml-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null)}
          <div className="min-w-0 flex-1">
            {title ? (
              <h1
                className={cn(
                  "truncate font-semibold leading-tight",
                  large ? "text-xl md:text-2xl" : "text-base md:text-lg",
                )}
              >
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
      </div>
    </header>
  );
}
