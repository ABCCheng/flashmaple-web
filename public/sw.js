const CACHE_PREFIX = "flashmaple-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v4`;
const OFFLINE_URL = "/offline.html";
const PUSH_PREFERENCES_CACHE_NAME = `${CACHE_PREFIX}push-preferences-v1`;
const PUSH_PREFERENCES_URL = "/__flashmaple-push-preferences__";
const MAX_PUSH_MESSAGES = 20;
const PUSH_EVENT = "flashmaple:push";
let inboxDatabase = null;
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
                key !== PUSH_PREFERENCES_CACHE_NAME
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

  if (event.data?.type === PUSH_EVENT) {
    if (event.data.action === "dismiss-notifications") {
      // System notifications are separate from inbox messages and unread state.
      event.waitUntil(dismissPushNotifications().catch((error) => {
        console.warn("Dismiss push notifications failed", error);
      }));
      return;
    }
    if (event.data.action === "sync-inbox") {
      event.waitUntil(openInboxDatabase().then(async (database) => {
        await syncInboxViews(database, await readInbox(database));
      }).catch((error) => {
        console.warn("Push inbox sync failed", error);
      }));
    }
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

async function dismissPushNotifications() {
  const notifications = await self.registration.getNotifications();
  notifications.forEach((notification) => notification.close());
}

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

// IndexedDB serializes read/write transactions across worker instances. No
// asynchronous platform work belongs inside the read-modify-write transaction.
function inboxTransaction(database, change) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("inbox", change ? "readwrite" : "readonly");
    const store = transaction.objectStore("inbox");
    const request = store.get("state");
    let result;
    let failure;
    request.onsuccess = () => {
      result = request.result;
      try {
        if (result && (!Number.isSafeInteger(result.revision) || !Array.isArray(result.messages))) {
          throw new Error("Invalid push inbox");
        }
        if (change) {
          const next = change(result);
          if (next !== result) store.put(next, "state");
          result = next;
        }
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure || transaction.error || new Error("Inbox transaction aborted"));
  });
}

function openInboxDatabase() {
  if (inboxDatabase) return inboxDatabase;
  inboxDatabase = new Promise((resolve, reject) => {
    const request = indexedDB.open("flashmaple-push-inbox", 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("inbox");};
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        inboxDatabase = null;
      };
      database.onclose = () => { inboxDatabase = null; };
      resolve(database);
    };
  }).catch((error) => {
    inboxDatabase = null;
    throw error;
  });

  return inboxDatabase;
}

async function readInbox(database) {
  return await inboxTransaction(database) ?? { revision: 0, messages: [] };
}

async function syncInboxBadge(database) {
  try {
    let snapshot = await inboxTransaction(database);
    // An uninitialized database is not evidence that the OS badge should clear.
    if (!snapshot) return;
    for (;;) {
      const unread = snapshot.messages.filter((message) => !message.read).length;
      if (unread) await self.navigator.setAppBadge?.(unread);
      else await self.navigator.clearAppBadge?.();
      const latest = await readInbox(database);
      if (latest.revision === snapshot.revision) return;
      // Another instance may have committed while the OS call was pending.
      // Reapply the current count instead of leaving a late, stale badge.
      snapshot = latest;
    }
  } catch (error) {
    console.warn("Push badge update failed", error);
  }
}

async function syncInboxViews(database, snapshot) {
  // Publish committed messages independently of the platform badge call.
  await Promise.all([
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      windows.forEach((client) => {
        try { client.postMessage({ type: PUSH_EVENT, action: "snapshot", snapshot }); } catch { /* Client closed. */ }
      });
    }).catch((error) => console.warn("Push inbox broadcast failed", error)),
    syncInboxBadge(database),
  ]);
}

async function updateInbox(command) {
  const database = await openInboxDatabase();
  let changed = false;
  const result = await inboxTransaction(database, (stored) => {
    const inbox = stored ?? { revision: 0, messages: [] };
    let messages = inbox.messages;
    switch (command.action) {
      case "receive":
        if (messages.some((message) => message.id === command.message.id)) return stored;
        messages = [command.message, ...messages];
        break;
      case "read":
        messages = messages.map((message) => message.id === command.id && !message.read ? { ...message, read: true } : message);
        break;
      default: throw new Error("Unknown push inbox action");
    }
    changed = messages.length !== inbox.messages.length || messages.some((message, index) => message !== inbox.messages[index]);
    if (!changed) return stored;
    messages = messages.slice(0, MAX_PUSH_MESSAGES);
    return { revision: inbox.revision + 1, messages };
  });
  const snapshot = result ?? { revision: 0, messages: [] };
  if (changed) await syncInboxViews(database, snapshot);
  return snapshot;
}

function notificationUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.searchParams.get("id");
    if (url.origin !== self.location.origin || parts.length !== 4 || parts[0] !== "app" ||
        !SUPPORTED_LANGUAGES.includes(parts[1]) || parts[2] !== "news" || parts[3] !== "detail" ||
        !id || !/^[1-9]\d*$/.test(id)) return null;
    // Also cleans URLs on notifications delivered by an older worker.
    return new URL(`/app/${parts[1]}/news/detail?id=${id}&source=notification`, self.location.origin).href;
  } catch {
    return null;
  }
}

async function showNewsItemNotification(payload) {
  const data = payload?.data;
  if (!data || data.type !== "news-item" || !Number.isSafeInteger(Number(data.newsId)) || Number(data.newsId) <= 0) return;

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
  const newsId = String(Number(data.newsId));
  const url = new URL(
    `/app/${languageCode}/news/detail?id=${newsId}&source=notification`,
    self.location.origin,
  ).toString();
  const messageId = typeof payload.tag === "string" && payload.tag
    ? payload.tag
    : `${String(data.newsId)}:${Date.now()}`;

  try {
    await updateInbox({ action: "receive", message: {
      id: messageId,
      newsId,
      title,
      body: newsTitle,
      receivedAt: new Date().toISOString(),
      read: false,
      url,
    } });
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

async function openNotification(target) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const app = windows.find((client) => {
    const url = new URL(client.url);
    return url.origin === self.location.origin && isAppPath(url.pathname);
  });
  if (app) {
    try {
      // A live app pushes an ordinary history entry; it owns its return page.
      app.postMessage({ type: PUSH_EVENT, action: "open", url: target });
      await app.focus();
      return;
    } catch { /* The app closed between matchAll and focus. */ }
  }
  await self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, messageId } = event.notification.data || {};
  const target = notificationUrl(url);
  if (!target) return;
  event.waitUntil(Promise.all([
    openNotification(target),
    updateInbox({ action: "read", id: messageId }).catch((error) => {
      console.warn("Push inbox update failed", error);
    }),
  ]));
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
