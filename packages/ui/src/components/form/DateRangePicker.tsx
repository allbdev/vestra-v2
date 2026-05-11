import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

function isDateInRange(date: Date, from: Date, to: Date): boolean {
  const d = startOfDay(date).getTime();
  const f = startOfDay(from).getTime();
  const t = startOfDay(to).getTime();
  return d >= f && d <= t;
}

function rangesEqual(a: DateRange | undefined, b: DateRange | undefined): boolean {
  if (!a?.from || !b?.from) return false;
  const aTo = a.to ?? a.from;
  const bTo = b.to ?? b.from;
  return (
    startOfDay(a.from).getTime() === startOfDay(b.from).getTime() &&
    startOfDay(aTo).getTime() === startOfDay(bTo).getTime()
  );
}

const PRESETS = [
  { id: "hoje", label: "Hoje", getRange: (ref: Date) => ({ from: startOfDay(ref), to: endOfDay(ref) }) },
  {
    id: "ontem",
    label: "Ontem",
    getRange: (ref: Date) => {
      const y = subDays(ref, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    },
  },
  {
    id: "ultimos-7",
    label: "Últimos 7 dias",
    getRange: (ref: Date) => ({ from: startOfDay(subDays(ref, 6)), to: endOfDay(ref) }),
  },
  {
    id: "ultimos-30",
    label: "Últimos 30 dias",
    getRange: (ref: Date) => ({ from: startOfDay(subDays(ref, 29)), to: endOfDay(ref) }),
  },
  {
    id: "esta-semana",
    label: "Esta semana",
    getRange: (ref: Date) => ({
      from: startOfWeek(ref, { locale: ptBR }),
      to: endOfWeek(ref, { locale: ptBR }),
    }),
  },
  {
    id: "semana-passada",
    label: "Semana passada",
    getRange: (ref: Date) => {
      const lw = subWeeks(ref, 1);
      return { from: startOfWeek(lw, { locale: ptBR }), to: endOfWeek(lw, { locale: ptBR }) };
    },
  },
  {
    id: "este-mes",
    label: "Este mês",
    getRange: (ref: Date) => ({ from: startOfMonth(ref), to: endOfMonth(ref) }),
  },
  {
    id: "mes-anterior",
    label: "Mês anterior",
    getRange: (ref: Date) => {
      const lm = subMonths(ref, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    },
  },
  {
    id: "este-ano",
    label: "Este ano",
    getRange: (ref: Date) => ({ from: startOfYear(ref), to: endOfYear(ref) }),
  },
] as const;

export interface DateRangePickerProps {
  className?: string;
  value?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  align?: "center" | "start" | "end";
  canClean?: boolean;
  placeholder?: string;
}

export function DateRangePicker({
  className,
  value,
  onValueChange,
  align = "start",
  canClean = true,
  placeholder = "Selecione um período",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const nextClickUpdatesEndRef = useRef(true);
  const isMobile = useIsMobile();

  const handleSelect = useCallback(
    (range: DateRange | undefined, triggerDate: Date | undefined) => {
      if (!triggerDate || !value?.from || !value.to) {
        onValueChange?.(range);
        return;
      }
      const inside = isDateInRange(triggerDate, value.from, value.to);
      if (!inside) {
        nextClickUpdatesEndRef.current = true;
        onValueChange?.(range);
        return;
      }
      if (nextClickUpdatesEndRef.current) {
        nextClickUpdatesEndRef.current = false;
        const newFrom = value.from;
        const newTo = triggerDate;
        onValueChange?.(
          startOfDay(newTo) < startOfDay(newFrom)
            ? { from: newTo, to: newFrom }
            : { from: newFrom, to: newTo },
        );
      } else {
        nextClickUpdatesEndRef.current = true;
        const newFrom = triggerDate;
        const newTo = value.to;
        onValueChange?.(
          startOfDay(newFrom) > startOfDay(newTo)
            ? { from: newTo, to: newFrom }
            : { from: newFrom, to: newTo },
        );
      }
    },
    [value?.from, value?.to, onValueChange],
  );

  const displayValue = useMemo(() => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, "dd/MM/yyyy", { locale: ptBR });
    return `${format(value.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(
      value.to,
      "dd/MM/yyyy",
      { locale: ptBR },
    )}`;
  }, [value, placeholder]);

  const today = useMemo(() => new Date(), []);

  const handlePreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      onValueChange?.(preset.getRange(today));
      setOpen(false);
    },
    [onValueChange, today],
  );

  const isPresetActive = useCallback(
    (preset: (typeof PRESETS)[number]) => rangesEqual(value, preset.getRange(today)),
    [value, today],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 pr-9 text-left font-normal",
              !value?.from && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue}</span>
          </Button>
          {value?.from && canClean ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange?.(undefined);
              }}
              aria-label="Limpar período"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn(
          "p-0",
          isMobile
            ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[80dvh] overflow-y-auto"
            : "w-auto min-w-[600px]",
        )}
      >
        <div className={cn("flex", isMobile ? "flex-col" : "flex-row")}>
          <div
            className={cn(
              "flex shrink-0 p-2",
              isMobile
                ? "flex-row flex-wrap gap-1 border-b border-border"
                : "flex-col gap-0.5 border-r border-border w-44",
            )}
          >
            {PRESETS.map((p) => {
              const active = isPresetActive(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-normal transition-colors",
                    isMobile ? "shrink-0" : "w-full text-left",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className={cn("min-w-0 flex-1 overflow-hidden", isMobile && "p-2")}>
            <Calendar
              autoFocus
              mode="range"
              defaultMonth={value?.from}
              selected={value}
              onSelect={(range, triggerDate) => handleSelect(range, triggerDate)}
              numberOfMonths={isMobile ? 1 : 2}
              locale={ptBR}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { DateRange };
