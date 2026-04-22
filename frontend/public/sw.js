// CampusCrate Service Worker — Web Push Handler
// Registered at /sw.js (served from public/)

const CACHE_NAME = "campuscrate-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Push event: show notification ───────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: "CampusCrate", body: event.data?.text() || "New notification" };
  }

  const title = data.title || "CampusCrate";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: data.data?.url || "default", // group notifications by URL to prevent duplicates
    renotify: true,
    actions: [
      { action: "open", title: "View" },
      { action: "dismiss", title: "Dismiss" }
    ]
  };

  event.waitUntil(
    // Check if user is actively viewing the relevant page
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const targetUrl = data.data?.url;
      const isAlreadyOpen = targetUrl && windowClients.some((client) => {
        try {
          const clientUrl = new URL(client.url);
          const target = new URL(targetUrl, self.location.origin);
          return clientUrl.pathname === target.pathname && client.focused;
        } catch {
          return false;
        }
      });

      // Suppress if user is actively viewing that exact page
      if (isAlreadyOpen) return;

      return self.registration.showNotification(title, options);
    })
  );
});

// ── Notification click: navigate to deep link ────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          return client.navigate(fullUrl);
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// ── Push subscription change ─────────────────────────────────────────────────
self.addEventListener("pushsubscriptionchange", (event) => {
  // Re-subscribe automatically when subscription expires
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey
    }).then((newSubscription) => {
      // Notify the app to update the subscription on the server
      return clients.matchAll({ type: "window" }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: "PUSH_SUBSCRIPTION_CHANGED",
            subscription: newSubscription.toJSON()
          });
        });
      });
    })
  );
});
