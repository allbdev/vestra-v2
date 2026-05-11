import { Toaster as SonnerToaster, toast } from "sonner";
import { useTheme } from "../../hooks/useTheme";

export function Toaster() {
  const { resolved } = useTheme();
  return (
    <SonnerToaster
      theme={resolved}
      position="top-center"
      richColors
      closeButton
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-background text-foreground shadow-lg rounded-xl",
          title: "text-sm font-medium",
          description: "text-sm text-muted-foreground",
        },
      }}
    />
  );
}

export { toast };
