const authStateChangeEvent = "flashmaple:auth-state-change";
const authStorageKeys = new Set(["FLASH_MAPLE_USER_INFO"]);

export function notifyAuthStateChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(authStateChangeEvent));
}

export function subscribeAuthStateChanged(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key && authStorageKeys.has(event.key)) listener();
  };

  window.addEventListener(authStateChangeEvent, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(authStateChangeEvent, listener);
    window.removeEventListener("storage", handleStorage);
  };
}
