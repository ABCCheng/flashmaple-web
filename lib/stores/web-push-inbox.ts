export type WebPushMessage = {
  id: string;
  newsId: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
  url: string;
};

export type InboxSnapshot = { revision: number; messages: WebPushMessage[] };

let databaseRequest: Promise<IDBDatabase> | null = null;

// Shared with public/sw.js. IndexedDB serializes read/write transactions across
// pages and workers, so simultaneous reads/deletes/pushes cannot lose messages.
function openInboxDatabase() {
  if (databaseRequest) return databaseRequest;
  databaseRequest = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("flashmaple-push-inbox", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("inbox");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => { database.close(); databaseRequest = null; };
      database.onclose = () => { databaseRequest = null; };
      resolve(database);
    };
  }).catch((error) => { databaseRequest = null; throw error; });
  return databaseRequest;
}

async function inboxTransaction(change?: (messages: WebPushMessage[]) => WebPushMessage[]): Promise<InboxSnapshot> {
  const database = await openInboxDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("inbox", change ? "readwrite" : "readonly");
    const store = transaction.objectStore("inbox");
    const request = store.get("state");
    let result: InboxSnapshot;
    let failure: Error | undefined;
    request.onsuccess = () => {
      const value = request.result;
      if (value === undefined) {
        result = { revision: 0, messages: [] };
      } else if (Number.isSafeInteger(value?.revision) && Array.isArray(value?.messages)) {
        result = value;
      } else {
        failure = new Error("Invalid push inbox");
        transaction.abort();
        return;
      }
      if (change) {
        try {
          const messages = change(result.messages);
          const changed = messages.length !== result.messages.length ||
            messages.some((message, index) => message !== result.messages[index]);
          if (changed) {
            result = { revision: result.revision + 1, messages };
            store.put(result, "state");
          }
        } catch (error) {
          failure = error instanceof Error ? error : new Error(String(error));
          transaction.abort();
        }
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure || transaction.error || new Error("Inbox read aborted"));
  });
}

export const readWebPushInbox = () => inboxTransaction();

export type InboxAction = "read" | "delete" | "read-all" | "clear";

export function updateWebPushInbox(action: InboxAction, id?: string) {
  return inboxTransaction((messages) => {
    switch (action) {
      case "read": return messages.map((message) => message.id === id && !message.read ? { ...message, read: true } : message);
      case "delete": return messages.filter((message) => message.id !== id);
      case "read-all": return messages.map((message) => message.read ? message : { ...message, read: true });
      case "clear": return [];
    }
  });
}
