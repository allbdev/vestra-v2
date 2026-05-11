import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { cn } from "../../lib/cn";

export interface ErrorStateProps {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar este conteúdo. Tente novamente.",
  onRetry,
  retryLabel = "Tentar novamente",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" className="mt-2">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
