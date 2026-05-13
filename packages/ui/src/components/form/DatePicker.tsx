import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { Matcher } from "react-day-picker";
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

function parseIsoLocal(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(year, month, day);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DatePickerProps {
  id?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  align?: "center" | "start" | "end";
  canClean?: boolean;
}

export function DatePicker({
  id,
  className,
  value,
  onValueChange,
  min,
  max,
  disabled,
  invalid,
  placeholder = "Selecione uma data",
  align = "start",
  canClean = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selected = useMemo(() => parseIsoLocal(value), [value]);

  const displayValue = useMemo(() => {
    if (!selected) return placeholder;
    return format(selected, "dd/MM/yyyy", { locale: ptBR });
  }, [selected, placeholder]);

  const disabledMatchers = useMemo<Matcher[]>(() => {
    const list: Matcher[] = [];
    if (min) list.push({ before: min });
    if (max) list.push({ after: max });
    return list;
  }, [min, max]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "h-12 w-full justify-start gap-2 pr-9 text-left font-normal md:h-10",
              !selected && "text-muted-foreground",
              invalid && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{displayValue}</span>
          </Button>
          {selected && canClean && !disabled ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange?.(undefined);
              }}
              aria-label="Limpar data"
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
          isMobile ? "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]" : "w-auto",
        )}
      >
        <Calendar
          autoFocus
          mode="single"
          defaultMonth={selected}
          selected={selected}
          onSelect={(d) => {
            if (!d) {
              onValueChange?.(undefined);
              return;
            }
            onValueChange?.(toIsoLocal(d));
            setOpen(false);
          }}
          disabled={disabledMatchers.length ? disabledMatchers : undefined}
          locale={ptBR}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
