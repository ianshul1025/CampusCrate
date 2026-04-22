const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const SW_PATH = "/sw.js";

/**
 * Convert URL-safe base64 VAPID key to Uint8Array for PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Register the Service Worker if not already registered.
 */
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    console.log("SW registered:", reg.scope);

    // Listen for subscription changes relayed by SW
    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") {
        const token = localStorage.getItem("clerk-auth-token");
        if (token && event.data.subscription) {
          await sendSubscriptionToServer(event.data.subscription, token);
        }
      }
    });

    return reg;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

/**
 * Subscribe to Web Push notifications.
 * Fetches VAPID key from server, then calls PushManager.subscribe().
 * @param {Function} getToken - Clerk getToken function
 */
export async function subscribeToPush(getToken) {
  if (!("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  // Get VAPID public key from server (no auth required)
  const res = await fetch(`${API_URL}/notifications/push/vapid-key`);
  const data = await res.json();
  const vapidPublicKey = data.data?.publicKey;
  if (!vapidPublicKey) throw new Error("Could not get VAPID key from server");

  // Get SW registration
  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Sync existing subscription with server
    const token = await getToken();
    await sendSubscriptionToServer(existing.toJSON(), token);
    return existing;
  }

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  // Send to backend
  const token = await getToken();
  await sendSubscriptionToServer(subscription.toJSON(), token);

  return subscription;
}

/**
 * Send subscription object to our backend.
 */
async function sendSubscriptionToServer(subscription, token) {
  await fetch(`${API_URL}/notifications/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ subscription })
  });
}

/**
 * Unsubscribe from Web Push and notify server.
 * @param {Function} getToken - Clerk getToken function
 */
export async function unsubscribeFromPush(getToken) {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const token = await getToken();
  await fetch(`${API_URL}/notifications/push/unsubscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ endpoint })
  });
}

/**
 * Request notification permission.
 * Returns "granted" | "denied" | "default"
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  return await Notification.requestPermission();
}
