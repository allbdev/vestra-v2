import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PayloadEntry {
  name?: string | number;
  // Recharts widens these — value can be array, dataKey can be a fn.
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly PayloadEntry[];
  label?: ReactNode;
  /** Format the numeric value column. */
  formatter?: (value: number, name: string) => ReactNode;
  /** Format the header label (axis tick). Second arg is the recharts payload. */
  labelFormatter?: (label: ReactNode, payload?: readonly PayloadEntry[]) => ReactNode;
  /** Hide the per-series swatch column. */
  hideIndicator?: boolean;
  className?: string;
}

/**
 * Recharts-compatible tooltip body that styles itself with Vestra design
 * tokens (popover background, border, foreground) so light + dark themes
 * both work. Pass as `content={(p) => <ChartTooltip {...p} ... />}`.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  hideIndicator,
  className,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className={cn(
        "min-w-[10rem] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md",
        className,
      )}
      role="tooltip"
    >
      {label != null && label !== "" ? (
        <p className="mb-1 font-medium text-foreground">
          {labelFormatter ? labelFormatter(label, payload) : label}
        </p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((p, i) => {
          const rawValue: unknown = p.value;
          const numericValue =
            typeof rawValue === "number" ? rawValue : Number((rawValue as string | number) ?? 0);
          const rawName: unknown = p.name ?? p.dataKey;
          const name =
            typeof rawName === "string" || typeof rawName === "number" ? String(rawName) : "";
          return (
            <li key={`${name}-${i}`} className="flex items-center gap-2">
              {hideIndicator ? null : (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color ?? "var(--muted-foreground)" }}
                  aria-hidden
                />
              )}
              <span className="text-muted-foreground">{name}</span>
              <span className="ml-auto font-medium tabular-nums text-foreground">
                {formatter ? formatter(numericValue, name) : numericValue}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
