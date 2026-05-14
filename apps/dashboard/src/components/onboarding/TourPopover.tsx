import type { ReactNode } from "react";
import { X } from "lucide-react";
import {
  Button,
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@vestra/ui";

export interface TourPopoverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  children: ReactNode;
}

export function TourPopover({
  open,
  onClose,
  title,
  subtitle,
  actionLabel,
  onAction,
  side = "bottom",
  align = "center",
  children,
}: TourPopoverProps) {
  return (
    <Popover open={open} onOpenChange={(value) => !value && onClose()}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        side={side}
        align={align}
        className="w-[min(20rem,calc(100vw-2rem))] p-4"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="space-y-2 pr-6">
          <h3 className="text-sm font-semibold leading-snug">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actionLabel && onAction ? (
          <div className="mt-4">
            <Button type="button" size="sm" className="w-full" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
