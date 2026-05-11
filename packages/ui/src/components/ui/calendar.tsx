import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "../../lib/cn";

export type CalendarProps = DayPickerProps;

/**
 * Vestra-themed wrapper around react-day-picker v10. Uses our design tokens
 * via classNames so light/dark themes both work, and replaces the default
 * nav chevrons with lucide icons.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center text-sm font-medium",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-between absolute inset-x-1 top-1.5 z-10",
        button_previous: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md p-0 opacity-70 transition-opacity",
          "hover:opacity-100 hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        button_next: cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md p-0 opacity-70 transition-opacity",
          "hover:opacity-100 hover:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.75rem] font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 font-normal",
          "hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:font-medium",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:text-muted-foreground/40 [&>button]:opacity-50",
        range_start:
          "[&>button]:rounded-r-none [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_end:
          "[&>button]:rounded-l-none [&>button]:bg-primary [&>button]:text-primary-foreground",
        range_middle:
          "[&>button]:rounded-none [&>button]:bg-accent [&>button]:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
