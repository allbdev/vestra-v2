import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "vestra_install_prompt_dismissed_at";
const COOLDOWN_DAYS = 14;

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isDismissedRecently = (() => {
    if (typeof window === "undefined") return true;
    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    if (!dismissed) return false;
    const ts = Number(dismissed);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  })();

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true);

  const canPrompt = !!deferred && !installed && !isStandalone && !isDismissedRecently;

  const promptInstall = async () => {
    if (!deferred) return null;
    await deferred.prompt();
    const result = await deferred.userChoice;
    if (result.outcome === "dismissed") {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    setDeferred(null);
    return result.outcome;
  };

  const dismiss = () => {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setDeferred(null);
  };

  return { canPrompt, promptInstall, dismiss, isStandalone, installed };
}
