const CACHE_PREFIX = "flashmaple-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const OFFLINE_URL = "/offline.html";
const PUSH_PREFERENCES_CACHE_NAME = `${CACHE_PREFIX}push-preferences-v1`;
const PUSH_PREFERENCES_URL = "/__flashmaple-push-preferences__";
const PUSH_MESSAGES_CACHE_NAME = `${CACHE_PREFIX}push-messages-v1`;
const PUSH_MESSAGES_URL = "/__flashmaple-push-messages__";
const MAX_PUSH_MESSAGES = 20;
const DEFAULT_PUSH_PREFERENCES = { languageCode: "en", region: "Toronto" };
const SUPPORTED_LANGUAGES = ["en", "fr", "zh-Hans", "zh-Hant", "pa", "es", "ja", "ko", "ru", "vi"];
const SUPPORTED_REGIONS = ["Toronto", "Vancouver", "Montreal", "Calgary", "Winnipeg", "Saskatoon", "Halifax"];
const BREAKING_NEWS_TITLES = {
  en: "Flash",
  fr: "Flash",
  "zh-Hans": "快闪时讯",
  "zh-Hant": "快閃時訊",
  pa: "ਤਾਜ਼ਾ ਖ਼ਬਰ",
  es: "Flash",
  ja: "速報",
  ko: "속보",
  ru: "Flash",
  vi: "Tin nóng",
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/logo-192.png"]).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== CACHE_NAME &&
                key !== PUSH_PREFERENCES_CACHE_NAME &&
                key !== PUSH_MESSAGES_CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
    .then(() => self.clients.claim())
  );
});

function isAppPath(pathname) {
  return pathname === "/app" || pathname.startsWith("/app/");
}

async function cacheNavigation(request, response) {
  if (!response.ok || response.type === "opaque") return;

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());

  if (response.url && response.url !== request.url) {
    await cache.put(response.url, response.clone());
  }
}

async function cacheCurrentNavigation(url) {
  try {
    const requestUrl = new URL(url, self.location.origin);
    if (requestUrl.origin !== self.location.origin || !isAppPath(requestUrl.pathname)) return;

    const request = new Request(requestUrl, {
      cache: "no-store",
      credentials: "include",
    });
    const response = await fetch(request);
    await cacheNavigation(request, response);
  } catch {
    // Caching the current document is best-effort.
  }
}

async function cacheAssetUrls(urls) {
  if (!Array.isArray(urls)) return;

  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls.slice(0, 100).map(async (url) => {
      try {
        const requestUrl = new URL(url, self.location.origin);
        if (requestUrl.origin !== self.location.origin) return;

        const response = await fetch(new Request(requestUrl, { cache: "no-store" }));
        if (response.ok && response.type !== "opaque") {
          await cache.put(requestUrl, response.clone());
        }
      } catch {
        // Asset warming is best-effort.
      }
    })
  );
}

async function getOfflineNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedPage = await cache.match(request);
  if (cachedPage) return cachedPage;

  const cachedAppEntry = await cache.match(new URL("/app/en", self.location.origin));
  if (cachedAppEntry) return cachedAppEntry;

  const offlinePage = await cache.match(OFFLINE_URL);
  return offlinePage || new Response("FlashMaple is offline.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cacheNavigation(request, response);
      return response;
    }

    const cachedPage = await caches.match(request);
    return cachedPage || response;
  } catch {
    return getOfflineNavigation(request);
  }
}

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== "opaque") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "flashmaple:cache-navigation") {
    event.waitUntil(cacheCurrentNavigation(event.data.url));
    return;
  }

  if (event.data?.type === "flashmaple:cache-assets") {
    event.waitUntil(cacheAssetUrls(event.data.urls));
    return;
  }

  if (event.data?.type === "flashmaple:clear-push-notifications") {
    event.waitUntil(clearPushNotifications());
    return;
  }

  if (event.data?.type === "flashmaple:update-app-badge") {
    event.waitUntil(updateAppBadge());
    return;
  }

  if (event.data?.type !== "flashmaple:push-preferences") return;

  const languageCode = SUPPORTED_LANGUAGES.includes(event.data.languageCode)
    ? event.data.languageCode
    : DEFAULT_PUSH_PREFERENCES.languageCode;
  const region = SUPPORTED_REGIONS.includes(event.data.region)
    ? event.data.region
    : DEFAULT_PUSH_PREFERENCES.region;
  event.waitUntil(writePushPreferences({ languageCode, region }));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(showNewsItemNotification(payload));
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(handlePushSubscriptionChange(event));
});

async function handlePushSubscriptionChange(event) {
  let subscription = event.newSubscription || null;

  if (!subscription) {
    try {
      const options = event.oldSubscription?.options || await getPushSubscriptionOptions();
      if (options) {
        subscription = await self.registration.pushManager.subscribe(options);
      }
    } catch (error) {
      console.warn("Push subscription recreation failed", error);
    }
  }

  const payload = subscription ? serializeWebPushSubscription(subscription) : null;
  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clientList.forEach((client) => {
    client.postMessage({
      type: "flashmaple:push-subscription-change",
      subscription: payload,
    });
  });
}

async function getPushSubscriptionOptions() {
  const preferences = await readPushPreferences();
  const deviceName = navigator.userAgent?.trim() || "FlashMaple Web";
  const response = await fetch("/api/web-push/config?appName=flashmaple", {
    cache: "no-store",
    headers: {
      "X-App-Name": "flashmaple",
      "X-Device-Name": deviceName,
      "X-Language": preferences.languageCode,
      "X-Region": preferences.region,
    },
  });
  if (!response.ok) return null;

  const payload = await response.json();
  const publicKey = payload?.code === 200 ? payload?.data?.publicKey : null;
  if (typeof publicKey !== "string" || !publicKey) return null;

  return {
    userVisibleOnly: true,
    applicationServerKey: decodeWebPushPublicKey(publicKey),
  };
}

function decodeWebPushPublicKey(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

function serializeWebPushSubscription(subscription) {
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

async function writePushPreferences(preferences) {
  const cache = await caches.open(PUSH_PREFERENCES_CACHE_NAME);
  const url = new URL(PUSH_PREFERENCES_URL, self.location.origin).href;
  await cache.put(
    url,
    new Response(JSON.stringify(preferences), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function readPushPreferences() {
  try {
    const cache = await caches.open(PUSH_PREFERENCES_CACHE_NAME);
    const url = new URL(PUSH_PREFERENCES_URL, self.location.origin).href;
    const response = await cache.match(url);
    if (!response) return DEFAULT_PUSH_PREFERENCES;

    const preferences = await response.json();
    return {
      languageCode: SUPPORTED_LANGUAGES.includes(preferences.languageCode)
        ? preferences.languageCode
        : DEFAULT_PUSH_PREFERENCES.languageCode,
      region: SUPPORTED_REGIONS.includes(preferences.region)
        ? preferences.region
        : DEFAULT_PUSH_PREFERENCES.region,
    };
  } catch {
    return DEFAULT_PUSH_PREFERENCES;
  }
}

async function readStoredPushMessages() {
  try {
    const cache = await caches.open(PUSH_MESSAGES_CACHE_NAME);
    const url = new URL(PUSH_MESSAGES_URL, self.location.origin).href;
    const response = await cache.match(url);
    if (!response) return [];

    const messages = await response.json();
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

async function writeStoredPushMessages(messages) {
  const cache = await caches.open(PUSH_MESSAGES_CACHE_NAME);
  const url = new URL(PUSH_MESSAGES_URL, self.location.origin).href;
  await cache.put(
    url,
    new Response(JSON.stringify(messages.slice(0, MAX_PUSH_MESSAGES)), {
      headers: { "Content-Type": "application/json" },
    })
  );
}

async function updateAppBadge() {
  if (typeof navigator === "undefined" || typeof navigator.setAppBadge !== "function") return;

  try {
    const messages = await readStoredPushMessages();
    const unreadCount = messages.filter((message) => !message?.read).length;
    if (unreadCount > 0) {
      await navigator.setAppBadge(unreadCount);
    } else if (typeof navigator.clearAppBadge === "function") {
      await navigator.clearAppBadge();
    }
  } catch {
    // App badges are optional and unsupported on some browsers/platforms.
  }
}

async function storeNewsPushMessage(message) {
  const messages = await readStoredPushMessages();
  const nextMessages = [
    message,
    ...messages.filter((item) => item?.id !== message.id),
  ].slice(0, MAX_PUSH_MESSAGES);
  await writeStoredPushMessages(nextMessages);
  await updateAppBadge();

  const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clientList.forEach((client) => {
    client.postMessage({ type: "flashmaple:push-message" });
  });
}

async function markStoredPushMessageRead(id) {
  if (!id) return;

  const messages = await readStoredPushMessages();
  await writeStoredPushMessages(messages.map((message) => (
    message?.id === id ? { ...message, read: true } : message
  )));
  await updateAppBadge();
}

async function clearPushNotifications() {
  const notifications = await self.registration.getNotifications();
  notifications.forEach((notification) => notification.close());
}

async function showNewsItemNotification(payload) {
  const data = payload?.data;
  if (!data || data.type !== "news-item" || data.newsId === undefined || data.newsId === null) return;

  const preferences = await readPushPreferences();

  const titles = data.titles && typeof data.titles === "object" ? data.titles : {};
  const newsTitle = [
    titles[preferences.languageCode],
    titles.en,
    ...Object.values(titles),
  ].find((value) => typeof value === "string" && value.trim())?.trim();
  if (!newsTitle) return;

  const notificationTitle = BREAKING_NEWS_TITLES[preferences.languageCode] || BREAKING_NEWS_TITLES.en;
  const source = typeof data.source === "string" ? data.source.trim() : "";
  const title = source ? `${notificationTitle} – ${source}` : notificationTitle;

  const languageCode = encodeURIComponent(preferences.languageCode);
  const newsId = encodeURIComponent(String(data.newsId));
  const url = new URL(
    `/app/${languageCode}/news/detail?id=${newsId}&source=notification`,
    self.location.origin,
  ).toString();
  const messageId = typeof payload.tag === "string" && payload.tag
    ? payload.tag
    : `${String(data.newsId)}:${Date.now()}`;

  try {
    await storeNewsPushMessage({
      id: messageId,
      newsId: String(data.newsId),
      title,
      body: newsTitle,
      receivedAt: new Date().toISOString(),
      read: false,
      url,
    });
  } catch (error) {
    console.warn("Push message persistence failed", error);
  }

  await self.registration.showNotification(title, {
    body: newsTitle,
    icon: "/logo-192.png",
    badge: "/logo-192.png",
    tag: payload.tag,
    data: { ...data, url, messageId },
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  const targetUrl = new URL(notificationData.url || "/app/en", self.location.origin).href;
  event.waitUntil((async () => {
    await markStoredPushMessageRead(notificationData.messageId);
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const matchingClient = clientList.find((client) => client.url === targetUrl);
    const existingClient = matchingClient || clientList.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });

    if (existingClient) {
      try {
        if (existingClient.url !== targetUrl) {
          existingClient.postMessage({
            type: "flashmaple:notification-navigation",
            url: targetUrl,
            messageId: notificationData.messageId,
          });
        }
        if ("focus" in existingClient) return existingClient.focus();
      } catch {
        // Fall through to opening a new app window when the existing one is unavailable.
      }
    }

    return self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (!isAppPath(url.pathname)) return;
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;
  if (url.searchParams.has("_rsc") || request.headers.has("RSC") || request.headers.has("Next-Router-State-Tree")) return;

  const isNextStaticAsset = url.pathname.startsWith("/_next/static/");
  const isStaticAsset = ["image", "font", "manifest", "style", "script"].includes(request.destination);
  if (!isNextStaticAsset && !isStaticAsset) return;

  event.respondWith(handleStaticRequest(request));
});
