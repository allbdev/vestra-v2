import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Input, type InputProps } from "../ui/input";

export interface MoneyInputProps
  extends Omit<InputProps, "value" | "onChange" | "type" | "inputMode"> {
  /** Decimal value (e.g. 1234.56). */
  value?: number | null;
  /** Fires with parsed number (in major units) on every change. */
  onValueChange?: (value: number | null) => void;
  /** Currency symbol shown to the left. Default "R$". */
  symbol?: string;
  /** Locale used for digit grouping/decimal char. Default "pt-BR". */
  locale?: string;
}

function format(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parse(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}

/**
 * BRL-formatted money input. Stores cents internally; surfaces decimal float.
 * Always uses `inputMode="decimal"` — never `type="number"`.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, symbol = "R$", locale = "pt-BR", className, onBlur, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

    const display = useMemo(() => format(value, locale), [value, locale]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = parse(e.target.value);
        onValueChange?.(parsed);
      },
      [onValueChange],
    );

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {symbol}
        </span>
        <Input
          ref={innerRef}
          inputMode="decimal"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          onBlur={onBlur}
          className={`pl-10 tabular-nums ${className ?? ""}`}
          {...props}
        />
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
