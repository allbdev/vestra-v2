import { forwardRef } from "react";
import { cn } from "../../lib/cn";

/**
 * Floating Action Button. Bottom-right above the tab bar on mobile.
 * Safe-area aware via fixed positioning + extra inset.
 */
export const Fab = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-30",
        "lg:bottom-6 lg:right-6",
        "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground",
        "shadow-lg transition-all hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "[&_svg]:size-6",
        className,
      )}
      {...props}
    />
  ),
);
Fab.displayName = "Fab";
