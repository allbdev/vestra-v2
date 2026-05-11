import { useCallback, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "../../lib/cn";

export interface CodeInputProps {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  className?: string;
}

/**
 * Multi-cell confirmation code input. Numeric keyboard on mobile.
 * Auto-advances on type, backspace moves left, paste fills cells.
 */
export function CodeInput({
  length = 6,
  value,
  onChange,
  disabled,
  autoFocus,
  invalid,
  className,
}: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = useCallback(
    (i: number, ch: string) => {
      const digit = ch.replace(/\D/g, "").slice(0, 1);
      const next = chars.slice();
      next[i] = digit || " ";
      onChange(next.join("").replace(/ /g, ""));
      if (digit && i < length - 1) inputs.current[i + 1]?.focus();
    },
    [chars, length, onChange],
  );

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !(chars[i] ?? "").trim() && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (text) {
      onChange(text);
      inputs.current[Math.min(text.length, length - 1)]?.focus();
    }
  };

  return (
    <div
      className={cn("flex justify-center gap-2", className)}
      role="group"
      aria-label="Verification code"
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus && i === 0}
          maxLength={1}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          value={(chars[i] ?? "").trim()}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste}
          className={cn(
            "h-14 w-12 rounded-lg border border-input bg-background text-center text-xl font-semibold",
            "tabular-nums shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive ring-destructive",
          )}
        />
      ))}
    </div>
  );
}
