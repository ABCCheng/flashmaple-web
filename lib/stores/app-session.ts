export const APP_SPLASH_SESSION_KEY = "FLASH_MAPLE_PWA_SPLASH_SHOWN";
const HISTORY_KEY = "__flashmaple";
let paths: string[] = [];
let position = 0;

// Track real browser operations, not guesses based on repeated URLs. In
// particular A -> B -> A is a push, whereas Back to A is a history traversal.
export function trackAppNavigation() {
  const history = window.history;
  const documentId = crypto.randomUUID();
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  let active = true;
  const currentPath = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;
  paths = [currentPath()];
  position = 0;
  const entryPosition = (data: unknown) => {
    const entry = (data as Record<string, { documentId?: string; position?: number }> | null)?.[HISTORY_KEY];
    return entry?.documentId === documentId && Number.isInteger(entry.position) ? entry.position! : null;
  };
  const stamp = (data: unknown) => ({
    ...(data && typeof data === "object" ? data : {}),
    [HISTORY_KEY]: { documentId, position },
  });
  originalReplace.call(history, stamp(history.state), "");

  const push: History["pushState"] = function (data, unused, url) {
    if (!active) return originalPush.call(history, data, unused, url);
    const nextPosition = position + 1;
    originalPush.call(history, { ...stamp(data), [HISTORY_KEY]: { documentId, position: nextPosition } }, unused, url);
    paths = [...paths.slice(0, nextPosition), currentPath()];
    position = nextPosition;
  };
  const replace: History["replaceState"] = function (data, unused, url) {
    if (!active) return originalReplace.call(history, data, unused, url);
    const restored = entryPosition(data);
    if (restored !== null) position = restored;
    originalReplace.call(history, stamp(data), unused, url);
    paths[position] = currentPath();
  };
  const restore = (event: PopStateEvent) => {
    const restored = entryPosition(event.state);
    position = restored ?? 0;
    if (restored === null) paths = [currentPath()];
  };
  history.pushState = push;
  history.replaceState = replace;
  window.addEventListener("popstate", restore);
  return () => {
    active = false;
    if (history.pushState === push) history.pushState = originalPush;
    if (history.replaceState === replace) history.replaceState = originalReplace;
    window.removeEventListener("popstate", restore);
  };
}

export function canGoBackInApp() { return position > 0; }
export function getPreviousAppNavigationPath() { return paths[position - 1] ?? null; }
