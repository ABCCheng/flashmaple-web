import { getServiceWorkerContainer } from "@/lib/web-push-client";

export const PUSH_EVENT = "flashmaple:push";
export type WebPushMessage = {
  id: string;
  newsId: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  url: string;
};
type InboxSnapshot = { revision: number; messages: WebPushMessage[] };
type InboxAction = "list" | "sync" | "read" | "delete" | "read-all" | "clear";
const emptyMessages: WebPushMessage[] = [];
let snapshot: InboxSnapshot = { revision: -1, messages: emptyMessages };
let syncError = false;
let refreshRequest: Promise<WebPushMessage[]> | null = null;
const listeners = new Set<() => void>();

function publish(value: InboxSnapshot) {
  if (!Number.isSafeInteger(value?.revision) || !Array.isArray(value.messages)) return;
  if (value.revision < snapshot.revision) return; // A delayed list response must not undo a push.
  if (value.revision === snapshot.revision && !syncError) return;
  snapshot = value;
  syncError = false;
  listeners.forEach((listener) => listener());
}

function request(action: InboxAction, id?: string): Promise<WebPushMessage[]> {
  return new Promise((resolve, reject) => {
    const worker = getServiceWorkerContainer();
    if (!worker) { reject(new Error("Service worker unavailable")); return; }
    const channel = new MessageChannel();
    let finished = false;
    const finish = (error?: Error, value?: InboxSnapshot) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      channel.port1.close();
      if (error) { reject(error); return; }
      publish(value!);
      resolve(snapshot.messages);
    };
    const timer = window.setTimeout(() => finish(new Error("Push inbox request timed out")), 8000);
    channel.port1.onmessage = ({ data }) => {
      if (data?.error || !Array.isArray(data?.snapshot?.messages) || !Number.isSafeInteger(data?.snapshot?.revision)) {
        finish(new Error(data?.error || "Invalid inbox response"));
      } else finish(undefined, data.snapshot);
    };
    void worker.ready.then((registration) => {
      if (finished) return;
      if (!registration.active) throw new Error("No active service worker");
      registration.active.postMessage({ type: PUSH_EVENT, action, id }, [channel.port2]);
    }).catch((error) => finish(error));
  });
}

function loadMessages(action: "list" | "sync") {
  const startingSnapshot = snapshot;
  return request(action).catch((error) => {
    console.warn("Push inbox sync failed", error);
    // A successful concurrent read or push supersedes this failed request.
    if (snapshot === startingSnapshot) {
      syncError = true;
      listeners.forEach((listener) => listener());
    }
    return snapshot.messages; // Keep the last good snapshot on resume/storage failures.
  });
}

export function getWebPushMessages() {
  if (refreshRequest) return refreshRequest;
  refreshRequest = loadMessages("list").finally(() => { refreshRequest = null; });
  return refreshRequest;
}

// Mounted once by AppShell, regardless of whether Flash or the inbox is visible.
export function connectWebPush(onOpen: (url: string) => void) {
  const worker = getServiceWorkerContainer();
  if (!worker) return () => {};
  let syncRequest: Promise<WebPushMessage[]> | null = null;
  const sync = () => {
    if (document.visibilityState !== "visible" || syncRequest) return;
    // Lifecycle reconciliation is separate from ordinary, read-only loading.
    syncRequest = loadMessages("sync").finally(() => { syncRequest = null; });
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== PUSH_EVENT) return;
    if (event.data.action === "snapshot") publish(event.data.snapshot);
    if (event.data.action === "open" && typeof event.data.url === "string") onOpen(event.data.url);
  };
  const onVisible = () => { void sync(); };
  worker.addEventListener("message", onMessage);
  worker.addEventListener("controllerchange", sync);
  document.addEventListener("visibilitychange", onVisible);
  sync();
  return () => {
    worker.removeEventListener("message", onMessage);
    worker.removeEventListener("controllerchange", sync);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export function subscribeWebPushMessageChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getCachedWebPushMessages = () => snapshot.messages;
export const getServerWebPushMessages = () => emptyMessages;
export const getWebPushMessageError = () => syncError;
export const hasLoadedWebPushMessages = () => snapshot.revision >= 0;
export const getUnreadWebPushMessageCount = () => snapshot.messages.filter((message) => !message.read).length;
export const markWebPushMessageRead = (id: string) => request("read", id);
export const deleteWebPushMessage = (id: string) => request("delete", id);
export const markAllWebPushMessagesRead = () => request("read-all");
export const clearWebPushMessages = () => request("clear");
