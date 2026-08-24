function getStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSessionStorage() {
  return getStorage("session");
}

export function readStorage(key: string) {
  return getStorage("local")?.getItem(key) ?? null;
}

export function writeStorage(key: string, value: string) {
  getStorage("local")?.setItem(key, value);
}

export function removeStorage(key: string) {
  getStorage("local")?.removeItem(key);
}

export function readSessionStorage(key: string) {
  return getSessionStorage()?.getItem(key) ?? null;
}

export function writeSessionStorage(key: string, value: string) {
  getSessionStorage()?.setItem(key, value);
}

export function removeSessionStorage(key: string) {
  getSessionStorage()?.removeItem(key);
}

export function readJsonStorage<T>(key: string) {
  const raw = readStorage(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJsonStorage<T>(key: string, value: T) {
  writeStorage(key, JSON.stringify(value));
}
