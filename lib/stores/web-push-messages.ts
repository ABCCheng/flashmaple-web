import { getServiceWorkerContainer } from "@/lib/web-push-client";

export const WEB_PUSH_MESSAGES_CACHE_NAME = "flashmaple-pwa-push-messages-v1";
export const WEB_PUSH_MESSAGES_URL = "/__flashmaple-push-messages__";
export const MAX_WEB_PUSH_MESSAGES = 20;

const messageChangeListeners = new Set<() => void>();
let cachedMessages: WebPushMessage[] = [];
let hasLoadedMessages = false;
let removeMessageSyncListeners: (() => void) | null = null;

export type WebPushMessage = {
  id: string;
  newsId: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  url: string;
};

function canUseCacheStorage() {
  return typeof window !== "undefined" && "caches" in window;
}

function getMessagesUrl() {
  return new URL(WEB_PUSH_MESSAGES_URL, window.location.origin).href;
}

function normalizeMessage(value: unknown): WebPushMessage | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<WebPushMessage>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.newsId !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.body !== "string" ||
    typeof candidate.receivedAt !== "string" ||
    typeof candidate.url !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    newsId: candidate.newsId,
    title: candidate.title,
    body: candidate.body,
    receivedAt: candidate.receivedAt,
    read: candidate.read === true,
    url: candidate.url,
  };
}

async function readMessages(): Promise<WebPushMessage[]> {
  if (!canUseCacheStorage()) return [];

  try {
    const cache = await window.caches.open(WEB_PUSH_MESSAGES_CACHE_NAME);
    const response = await cache.match(getMessagesUrl());
    if (!response) return [];

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];

    return payload.map(normalizeMessage).filter((message): message is WebPushMessage => Boolean(message));
  } catch {
    return [];
  }
}

async function writeMessages(messages: WebPushMessage[]) {
  const nextMessages = messages.slice(0, MAX_WEB_PUSH_MESSAGES);
  if (canUseCacheStorage()) {
    const cache = await window.caches.open(WEB_PUSH_MESSAGES_CACHE_NAME);
    await cache.put(
      getMessagesUrl(),
      new Response(JSON.stringify(nextMessages), {
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  cachedMessages = nextMessages;
  hasLoadedMessages = true;
  messageChangeListeners.forEach((listener) => listener());
  void requestWebPushAppBadgeUpdate();
  return nextMessages;
}

export async function getWebPushMessages() {
  cachedMessages = await readMessages();
  hasLoadedMessages = true;
  messageChangeListeners.forEach((listener) => listener());
  void requestWebPushAppBadgeUpdate();
  return cachedMessages;
}

export function getCachedWebPushMessages() {
  return cachedMessages;
}

export function hasCachedWebPushMessages() {
  return hasLoadedMessages;
}

async function requestWebPushAppBadgeUpdate() {
  const serviceWorker = getServiceWorkerContainer();
  if (!serviceWorker) return;

  try {
    const registration = await serviceWorker.ready;
    registration.active?.postMessage({ type: "flashmaple:update-app-badge" });
  } catch {
    // App badges are optional and unavailable when the service worker is not ready.
  }
}

export function getUnreadWebPushMessageCount() {
  return cachedMessages.reduce((count, message) => count + (message.read ? 0 : 1), 0);
}

export function subscribeWebPushMessageChanges(listener: () => void) {
  messageChangeListeners.add(listener);

  if (!removeMessageSyncListeners) {
    const serviceWorker = getServiceWorkerContainer();
    const loadMessages = () => {
      void getWebPushMessages();
    };
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "flashmaple:push-message") loadMessages();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadMessages();
    };

    serviceWorker?.addEventListener("message", handleServiceWorkerMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", loadMessages);

    removeMessageSyncListeners = () => {
      serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", loadMessages);
    };
  }

  return () => {
    messageChangeListeners.delete(listener);
    if (!messageChangeListeners.size) {
      removeMessageSyncListeners?.();
      removeMessageSyncListeners = null;
    }
  };
}

export async function markWebPushMessageRead(id: string, read = true) {
  const messages = await readMessages();
  return writeMessages(messages.map((message) => (
    message.id === id ? { ...message, read } : message
  )));
}

export async function deleteWebPushMessage(id: string) {
  const messages = await readMessages();
  return writeMessages(messages.filter((message) => message.id !== id));
}

export async function markAllWebPushMessagesRead() {
  const messages = await readMessages();
  return writeMessages(messages.map((message) => (
    message.read ? message : { ...message, read: true }
  )));
}

export async function clearWebPushMessages() {
  return writeMessages([]);
}
