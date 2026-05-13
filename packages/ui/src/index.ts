// Helpers
export { cn } from "./lib/cn";

// Hooks
export { ThemeProvider, useTheme, type Theme } from "./hooks/useTheme";

// UI primitives
export { Button, buttonVariants, type ButtonProps } from "./components/ui/button";
export { Input, type InputProps } from "./components/ui/input";
export { Textarea, type TextareaProps } from "./components/ui/textarea";
export { Label } from "./components/ui/label";
export { Checkbox } from "./components/ui/checkbox";
export { Badge, badgeVariants, type BadgeProps } from "./components/ui/badge";
export { Skeleton } from "./components/ui/skeleton";
export { Separator } from "./components/ui/separator";
export { Toaster, toast } from "./components/ui/toaster";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/ui/card";

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/ui/sheet";

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/ui/alert-dialog";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./components/ui/dropdown-menu";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from "./components/ui/select";

export { Switch } from "./components/ui/switch";

export { ChartTooltip, type ChartTooltipProps } from "./components/ui/chart-tooltip";

export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
} from "./components/ui/popover";

export { Calendar, type CalendarProps } from "./components/ui/calendar";

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./components/ui/accordion";

// Vestra composites
export { DateDisplay, type DateDisplayProps } from "./components/ui/DateDisplay";

// Form
export { FormField, type FormFieldProps } from "./components/form/FormField";
export { MoneyInput, type MoneyInputProps } from "./components/form/MoneyInput";
export { CodeInput, type CodeInputProps } from "./components/form/CodeInput";
export {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRange,
} from "./components/form/DateRangePicker";
export { DatePicker, type DatePickerProps } from "./components/form/DatePicker";
export {
  MultiSelect,
  type MultiSelectProps,
  type MultiSelectOption,
} from "./components/form/MultiSelect";

// Layout
export { TopBar, type TopBarProps } from "./components/layout/TopBar";
export {
  BottomTabBar,
  type BottomTabBarProps,
  type BottomTabItem,
} from "./components/layout/BottomTabBar";
export { AppShell, type AppShellProps } from "./components/layout/AppShell";
export { Fab } from "./components/layout/Fab";

// Feedback
export { EmptyState, type EmptyStateProps } from "./components/feedback/EmptyState";
export { ErrorState, type ErrorStateProps } from "./components/feedback/ErrorState";
export { PageSkeleton } from "./components/feedback/PageSkeleton";
