import { useMemo, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string | null;
  hint?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  align?: "center" | "start" | "end";
  emptyMessage?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Selecione",
  className,
  invalid,
  align = "start",
  emptyMessage = "Nenhuma opção",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedSet = useMemo(() => new Set(value), [value]);

  const toggle = (id: string) => {
    const next = selectedSet.has(id) ? value.filter((v) => v !== id) : [...value, id];
    onValueChange(next);
  };

  const display = useMemo(() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      return options.find((o) => o.value === value[0])?.label ?? placeholder;
    }
    return `${value.length} selecionados`;
  }, [value, options, placeholder]);

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Button
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className={cn(
              "h-12 w-full justify-between gap-2 pr-9 text-left font-normal md:h-10",
              value.length === 0 && "text-muted-foreground",
              invalid && "border-destructive focus-visible:ring-destructive",
            )}
          >
            <span className="truncate">{display}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {value.length > 0 ? (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Limpar seleção"
              className={cn(
                "absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[min(20rem,calc(100vw-2rem))] p-1">
        {options.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul role="listbox" aria-multiselectable className="max-h-72 overflow-y-auto">
            {options.map((opt) => {
              const checked = selectedSet.has(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm",
                      "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {checked ? <Check className="h-3 w-3" /> : null}
                    </span>
                    {opt.color ? (
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: opt.color }}
                      />
                    ) : null}
                    <span className="flex-1 truncate">{opt.label}</span>
                    {opt.hint ? (
                      <span className="text-xs text-muted-foreground">{opt.hint}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
