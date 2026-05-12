/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "vestra-nav",
      networkTimeoutSeconds: 3,
    }),
  ),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v1/workspaces"),
  new NetworkFirst({
    cacheName: "vestra-api-read",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })],
  }),
);

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: {
    id?: string;
    title?: string;
    body?: string;
    data?: Record<string, unknown> | null;
  } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Vestra", body: event.data.text() };
  }
  const title = payload.title ?? "Vestra";
  const opts: NotificationOptions = {
    body: payload.body ?? "",
    tag: payload.id,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: payload,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as
    | { data?: { transactionId?: string } | null }
    | undefined;
  const tid = data?.data?.transactionId;
  const url = tid ? `/transactions?highlight=${tid}` : "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
