import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf;
}

function arrayBufferToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

export function usePushSubscription() {
  const [state, setState] = useState<PermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC as string | undefined;

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined";

  useEffect(() => {
    if (!supported) {
      setState("unsupported");
      return;
    }
    setState(Notification.permission as PermissionState);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false));
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported || !vapidPublic) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setState(perm as PermissionState);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublic),
        });
      }

      const json = sub.toJSON();
      await api.post("/push/subscribe", {
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh")),
        auth: json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth")),
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
      return true;
    } finally {
      setBusy(false);
    }
  }, [supported, vapidPublic]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api
          .delete("/push/subscribe", { data: { endpoint: sub.endpoint } })
          .catch(() => undefined);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return {
    supported,
    permission: state,
    subscribed,
    busy,
    enable,
    disable,
    vapidConfigured: !!vapidPublic,
  };
}
