import {
  getWebPushConfig,
  subscribeWebPush,
  type WebPushConfig,
  type WebPushSubscriptionPayload,
} from "@/lib/api/web-push";

let cachedConfig: WebPushConfig | null = null;
let cachedConfigAt = 0;
let configRequest: Promise<WebPushConfig | null> | null = null;
const WEB_PUSH_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

export function getServiceWorkerContainer(): ServiceWorkerContainer | null {
  if (typeof navigator === "undefined") return null;

  try {
    return navigator.serviceWorker ?? null;
  } catch {
    return null;
  }
}

export function isWebPushSupported() {
  return (
    typeof window !== "undefined" &&
    getServiceWorkerContainer() !== null &&
    "PushManager" in window
  );
}

export function getWebPushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestWebPushPermission(): Promise<NotificationPermission | "unsupported"> {
  const permission = getWebPushPermission();
  if (permission !== "default") return permission;

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function getCachedWebPushConfig() {
  return cachedConfig;
}

export function cacheWebPushConfig(config: WebPushConfig) {
  cachedConfig = config;
  cachedConfigAt = Date.now();
}

export function loadWebPushConfig(force = false) {
  const cacheIsFresh = cachedConfig && Date.now() - cachedConfigAt < WEB_PUSH_CONFIG_CACHE_TTL_MS;
  if (!force && cacheIsFresh) return Promise.resolve(cachedConfig);
  if (configRequest) return configRequest;

  configRequest = getWebPushConfig({ silent: true })
    .then((response) => {
      if (response?.code !== 200 || !response.data) return null;
      cacheWebPushConfig(response.data);
      return response.data;
    })
    .finally(() => {
      configRequest = null;
    });

  return configRequest;
}

export function serializeWebPushSubscription(subscription: PushSubscription): WebPushSubscriptionPayload | null {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

export function decodeWebPushPublicKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

export async function getCurrentWebPushSubscription() {
  const serviceWorker = getServiceWorkerContainer();
  if (!serviceWorker || !isWebPushSupported()) return null;

  const registration = await serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function getOrCreateWebPushSubscription(config: WebPushConfig) {
  const serviceWorker = getServiceWorkerContainer();
  if (!serviceWorker || !isWebPushSupported() || !config.publicKey) return null;

  const registration = await serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeWebPushPublicKey(config.publicKey),
  });
}

export type WebPushSyncResult =
  | { status: "unsupported" }
  | { status: "config-unavailable" }
  | { status: "server-not-subscribed" }
  | { status: "no-local-subscription" }
  | { status: "invalid-subscription" }
  | { status: "synced" }
  | { status: "resubscribed" }
  | { status: "subscribe-failed"; responseCode?: number }
  | { status: "sync-error" };

export async function syncCurrentWebPushSubscription(config?: WebPushConfig) {
  if (!isWebPushSupported()) return { status: "unsupported" } satisfies WebPushSyncResult;

  try {
    const currentConfig = config ?? await loadWebPushConfig();
    if (!currentConfig) return { status: "config-unavailable" } satisfies WebPushSyncResult;
    if (!currentConfig.subscribed) {
      return { status: "server-not-subscribed" } satisfies WebPushSyncResult;
    }

    let subscription = await getCurrentWebPushSubscription();
    let resubscribed = false;
    if (!subscription) {
      subscription = await getOrCreateWebPushSubscription(currentConfig);
      resubscribed = Boolean(subscription);
    }
    if (!subscription) return { status: "no-local-subscription" } satisfies WebPushSyncResult;

    const payload = serializeWebPushSubscription(subscription);
    if (!payload) return { status: "invalid-subscription" } satisfies WebPushSyncResult;

    const response = await subscribeWebPush(payload, { silent: true });
    if (response?.code === 200) {
      return { status: resubscribed ? "resubscribed" : "synced" } satisfies WebPushSyncResult;
    }
    return { status: "subscribe-failed", responseCode: response?.code } satisfies WebPushSyncResult;
  } catch {
    return { status: "sync-error" } satisfies WebPushSyncResult;
  }
}
