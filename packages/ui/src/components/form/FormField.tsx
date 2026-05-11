import { forwardRef, type ReactNode } from "react";
import { Label } from "../ui/label";
import { cn } from "../../lib/cn";

export interface FormFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Standard form field wrapper: label on top, control, hint below, error
 * inline below replacing hint. Use with react-hook-form.
 */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, htmlFor, hint, error, required, className, children }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5", className)}>
        {label && (
          <Label htmlFor={htmlFor} className="flex items-center gap-1">
            {label}
            {required && (
              <span className="text-destructive" aria-label="required">
                *
              </span>
            )}
          </Label>
        )}
        {children}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = "FormField";
