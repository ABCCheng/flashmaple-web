import { getServiceWorkerContainer } from "@/lib/web-push-client";
import { readWebPushInbox, updateWebPushInbox, type InboxAction, type InboxSnapshot, type WebPushMessage } from "./web-push-inbox";

export type { WebPushMessage } from "./web-push-inbox";

const PUSH_EVENT = "flashmaple:push";
const emptyMessages: WebPushMessage[] = [];
let snapshot: InboxSnapshot = { revision: -1, messages: emptyMessages };
const listeners = new Set<() => void>();

function publish(value: InboxSnapshot) {
  if (!Number.isSafeInteger(value?.revision) || !Array.isArray(value.messages)) return;
  // A delayed read or worker broadcast must not overwrite a newer commit.
  if (value.revision <= snapshot.revision) return;
  snapshot = value;
  listeners.forEach((listener) => listener());
}

// One-way platform commands. Local reads/writes never wait for the worker.
async function notifyWorker(action: "sync-inbox" | "dismiss-notifications") {
  const worker = getServiceWorkerContainer();
  if (!worker) return;
  const registration = await worker.ready;
  registration.active?.postMessage({ type: PUSH_EVENT, action });
}

export const dismissWebPushNotifications = () => notifyWorker("dismiss-notifications");

export async function getWebPushMessages() {
  try {
    publish(await readWebPushInbox());
  } catch (error) {
    // Retain the last successful snapshot; a failed read is not an empty inbox.
    console.warn("Push inbox read failed", error);
  }
  return snapshot.messages;
}

function syncWorkerInbox() {
  void notifyWorker("sync-inbox").catch((error) => console.warn("Push inbox sync request failed", error));
}

async function updateMessages(action: InboxAction, id?: string) {
  publish(await updateWebPushInbox(action, id));
  syncWorkerInbox();
  return snapshot.messages;
}

// Mounted once by AppShell. Refresh after background suspension and worker updates.
export function connectWebPush(onOpen: (url: string) => void) {
  const worker = getServiceWorkerContainer();
  const sync = () => {
    if (document.visibilityState !== "visible") return;
    void getWebPushMessages();
    syncWorkerInbox();
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== PUSH_EVENT) return;
    if (event.data.action === "snapshot") publish(event.data.snapshot);
    if (event.data.action === "open" && typeof event.data.url === "string") onOpen(event.data.url);
  };
  worker?.addEventListener("message", onMessage);
  worker?.addEventListener("controllerchange", sync);
  document.addEventListener("visibilitychange", sync);
  sync();
  return () => {
    worker?.removeEventListener("message", onMessage);
    worker?.removeEventListener("controllerchange", sync);
    document.removeEventListener("visibilitychange", sync);
  };
}

export function subscribeWebPushMessageChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const getCachedWebPushMessages = () => snapshot.messages;
export const getServerWebPushMessages = () => emptyMessages;
export const hasLoadedWebPushMessages = () => snapshot.revision >= 0;
export const getUnreadWebPushMessageCount = () => snapshot.messages.filter((message) => !message.read).length;
export const markWebPushMessageRead = (id: string) => updateMessages("read", id);
export const deleteWebPushMessage = (id: string) => updateMessages("delete", id);
export const markAllWebPushMessagesRead = () => updateMessages("read-all");
export const clearWebPushMessages = () => updateMessages("clear");
