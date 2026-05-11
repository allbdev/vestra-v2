import { useEffect } from "react";
import { Smartphone } from "lucide-react";
import { toast } from "@vestra/ui";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useAuth } from "../auth/AuthProvider";

const SESSION_KEY = "vestra_install_toast_shown";

/**
 * Shown once per browser session for authed users on devices that support
 * native install. iOS Safari doesn't fire `beforeinstallprompt` — fallback
 * is the home-screen tip from a Settings entry (TODO).
 */
export function InstallPrompt() {
  const { user } = useAuth();
  const { canPrompt, promptInstall, dismiss } = useInstallPrompt();

  useEffect(() => {
    if (!user || !canPrompt) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    toast("Instale o Vestra", {
      description: "Adicione à tela inicial para acesso rápido.",
      icon: <Smartphone className="h-5 w-5" />,
      duration: 10_000,
      action: {
        label: "Instalar",
        onClick: () => {
          void promptInstall();
        },
      },
      cancel: {
        label: "Agora não",
        onClick: dismiss,
      },
    });
  }, [user, canPrompt, promptInstall, dismiss]);

  return null;
}
