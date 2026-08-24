const appScrollSnapshotEvent = "flashmaple:app-scroll-snapshot";
const appScrollPositions = new Map<string, number>();
let appScrollRestoreVersion = 0;
let removeRestoreCancellationListeners: (() => void) | null = null;

export function getAppScrollRoot() {
  if (typeof document === "undefined") return null;

  const isMobileWeb =
    window.matchMedia("(max-width: 767px)").matches &&
    !document.documentElement.classList.contains("app-standalone") &&
    (navigator as Navigator & { standalone?: boolean }).standalone !== true;

  if (isMobileWeb) {
    return document.scrollingElement as HTMLElement | null;
  }

  return document.querySelector<HTMLElement>(".app-content");
}

export function getAppScrollTop() {
  const root = getAppScrollRoot();
  if (!root) return 0;

  if (root === document.scrollingElement) {
    return window.scrollY || root.scrollTop || 0;
  }

  return root.scrollTop;
}

export async function scrollAppToTop(behavior: ScrollBehavior = "auto") {
  cancelPendingAppScrollRestore();
  const root = getAppScrollRoot();
  if (!root) return;

  if (root === document.scrollingElement) {
    window.scrollTo({ top: 0, behavior });
  } else {
    root.scrollTo({ top: 0, behavior });
  }

  if (behavior === "smooth") {
    for (let frame = 0; frame < 120; frame += 1) {
      if (getAppScrollTop() <= 1) return;
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });
    }
  }
}

function writeAppScrollTop(scrollTop: number) {
  const root = getAppScrollRoot();
  if (!root) return null;

  if (root === document.scrollingElement) {
    window.scrollTo({ top: scrollTop, behavior: "auto" });
  } else {
    root.scrollTo({ top: scrollTop, behavior: "auto" });
  }

  return root;
}

function cancelPendingAppScrollRestore() {
  appScrollRestoreVersion += 1;
  removeRestoreCancellationListeners?.();
  removeRestoreCancellationListeners = null;
}

function beginAppScrollRestore() {
  cancelPendingAppScrollRestore();
  const restoreVersion = appScrollRestoreVersion;
  const cancelForUserInput = () => {
    if (restoreVersion === appScrollRestoreVersion) {
      cancelPendingAppScrollRestore();
    }
  };

  window.addEventListener("wheel", cancelForUserInput, { passive: true });
  window.addEventListener("touchstart", cancelForUserInput, { passive: true });
  window.addEventListener("pointerdown", cancelForUserInput, { passive: true });
  window.addEventListener("keydown", cancelForUserInput);
  removeRestoreCancellationListeners = () => {
    window.removeEventListener("wheel", cancelForUserInput);
    window.removeEventListener("touchstart", cancelForUserInput);
    window.removeEventListener("pointerdown", cancelForUserInput);
    window.removeEventListener("keydown", cancelForUserInput);
  };

  return restoreVersion;
}

function finishAppScrollRestore(restoreVersion: number) {
  if (restoreVersion !== appScrollRestoreVersion) return;
  removeRestoreCancellationListeners?.();
  removeRestoreCancellationListeners = null;
}

function scheduleAppScrollRestore(scrollTop: number) {
  if (typeof window === "undefined") return;

  const restoreVersion = beginAppScrollRestore();
  let attempts = 0;
  const maxAttempts = 120;

  writeAppScrollTop(scrollTop);

  const restore = () => {
    if (restoreVersion !== appScrollRestoreVersion) return;
    attempts += 1;
    const root = writeAppScrollTop(scrollTop);
    if (!root) {
      finishAppScrollRestore(restoreVersion);
      return;
    }

    const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
    const needsMoreContent = maxScrollTop < scrollTop;
    const targetScrollTop = Math.min(scrollTop, maxScrollTop);
    const hasNotReachedTarget = Math.abs(getAppScrollTop() - targetScrollTop) > 1;
    if ((needsMoreContent || hasNotReachedTarget) && attempts < maxAttempts) {
      requestAnimationFrame(restore);
      return;
    }

    finishAppScrollRestore(restoreVersion);
  };

  requestAnimationFrame(() => {
    if (restoreVersion !== appScrollRestoreVersion) return;
    requestAnimationFrame(restore);
  });
}

export function rememberAppScrollPosition(key: string, scrollTop = getAppScrollTop()) {
  appScrollPositions.set(key, scrollTop);
}

export function restoreAppScrollPosition(key: string) {
  scheduleAppScrollRestore(appScrollPositions.get(key) ?? 0);
}

export function notifyAppScrollSnapshot(optionsOrEvent: unknown = {}) {
  if (typeof window === "undefined") return;

  const isOptions =
    typeof optionsOrEvent === "object" &&
    optionsOrEvent !== null &&
    "deactivate" in optionsOrEvent;
  const deactivate = isOptions &&
    Boolean((optionsOrEvent as { deactivate?: unknown }).deactivate);

  window.dispatchEvent(new CustomEvent(appScrollSnapshotEvent, {
    detail: { deactivate },
  }));
}

export function subscribeAppScrollSnapshot(listener: (event: Event) => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(appScrollSnapshotEvent, listener);
  return () => window.removeEventListener(appScrollSnapshotEvent, listener);
}
