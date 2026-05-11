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
  /** Render the bar as the page hero (larger title) when true. */
  large?: boolean;
}

/**
 * Sticky top bar. Mobile-first. Safe-area aware.
 * Back arrow appears when `onBack` is provided. `leading` overrides back.
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
        "sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md pt-safe",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:h-16",
          large && "h-auto flex-col items-start gap-1 py-4",
        )}
      >
        <div className="flex flex-1 items-center gap-2 min-w-0">
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
                  large ? "text-2xl md:text-3xl" : "text-base md:text-lg",
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
        {trailing ? <div className="flex items-center gap-1">{trailing}</div> : null}
      </div>
    </header>
  );
}
