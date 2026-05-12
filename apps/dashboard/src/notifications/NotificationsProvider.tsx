import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { NotificationDto } from "@vestra/types";
import Pusher, { type Channel } from "pusher-js";

if (import.meta.env.DEV) {
  Pusher.logToConsole = true;
}
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { notificationKeys } from "../api/hooks/useNotifications";

interface NotificationsContextValue {
  connected: boolean;
}

interface ListPage {
  items: NotificationDto[];
  nextCursor: string | null;
}

const NotificationsContext = createContext<NotificationsContextValue>({ connected: false });

function showOsNotification(n: NotificationDto) {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(n.title, {
      body: n.body,
      tag: n.id,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
    });
  } catch {
    // ignore — some browsers require SW for Notification ctor
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();

  const pusherKey = import.meta.env.VITE_PUSHER_KEY as string | undefined;
  const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined;
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

  useEffect(() => {
    if (!user || !accessToken || !pusherKey || !pusherCluster) {
      // eslint-disable-next-line no-console
      console.log("[pusher] skip subscribe", {
        hasUser: !!user,
        hasToken: !!accessToken,
        hasKey: !!pusherKey,
        hasCluster: !!pusherCluster,
      });
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: `${apiBase}/pusher/auth`,
      auth: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    pusher.connection.bind("state_change", (s: { previous: string; current: string }) => {
      // eslint-disable-next-line no-console
      console.log(`[pusher] connection ${s.previous} → ${s.current}`);
    });
    pusher.connection.bind("error", (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error("[pusher] connection error", err);
    });

    const channelName = `private-user-${user.id}`;
    const channel: Channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      // eslint-disable-next-line no-console
      console.log(`[pusher] subscribed: ${channelName}`);
    });
    channel.bind("pusher:subscription_error", (err: unknown) => {
      // eslint-disable-next-line no-console
      console.error(`[pusher] subscription_error: ${channelName}`, err);
    });

    channel.bind("notification", (payload: NotificationDto) => {
      // eslint-disable-next-line no-console
      console.log("[pusher] notification received", payload);
      qc.setQueryData<number>(notificationKeys.unread, (prev) => (prev ?? 0) + 1);
      qc.setQueryData<InfiniteData<ListPage>>(notificationKeys.list, (prev) => {
        if (!prev) return prev;
        const [first, ...rest] = prev.pages;
        if (!first) return prev;
        const merged: ListPage = {
          items: [payload, ...first.items.filter((i) => i.id !== payload.id)],
          nextCursor: first.nextCursor,
        };
        return { ...prev, pages: [merged, ...rest] };
      });
      showOsNotification(payload);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [user, accessToken, pusherKey, pusherCluster, apiBase, qc]);

  const value = useMemo<NotificationsContextValue>(
    () => ({ connected: !!(user && pusherKey) }),
    [user, pusherKey],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}
