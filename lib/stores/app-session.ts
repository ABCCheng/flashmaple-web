import { readSessionStorage, writeSessionStorage } from "./storage";

const APP_NAVIGATION_STACK_SESSION_KEY = "FLASH_MAPLE_APP_NAVIGATION_STACK";
export const APP_SPLASH_SESSION_KEY = "FLASH_MAPLE_PWA_SPLASH_SHOWN";
let appNavigationStackInitialized = false;

function readAppNavigationStack() {
  const value = readSessionStorage(APP_NAVIGATION_STACK_SESSION_KEY);
  if (!value) return [];

  try {
    const stack = JSON.parse(value);
    return Array.isArray(stack) ? stack.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeAppNavigationStack(stack: string[]) {
  writeSessionStorage(APP_NAVIGATION_STACK_SESSION_KEY, JSON.stringify(stack.slice(-50)));
}

export function initializeAppNavigationStack(path: string) {
  if (appNavigationStackInitialized) return;
  writeAppNavigationStack([path]);
  appNavigationStackInitialized = true;
}

export function rememberAppNavigationPath(path: string) {
  const stack = readAppNavigationStack();
  const previousPath = stack.at(-2);
  const currentPath = stack.at(-1);

  if (currentPath === path) return;

  if (previousPath === path) {
    writeAppNavigationStack(stack.slice(0, -1));
    return;
  }

  writeAppNavigationStack([...stack, path]);
}

export function canGoBackInApp() {
  return readAppNavigationStack().length > 1;
}

export function getPreviousAppNavigationPath() {
  return readAppNavigationStack().at(-2) ?? null;
}

export function replaceCurrentAppNavigationPath(path: string) {
  const stack = readAppNavigationStack();
  const nextStack = stack.length > 1 ? [...stack.slice(0, -2), path] : [path];
  writeAppNavigationStack(nextStack);
}

export function updateCurrentAppNavigationPath(path: string) {
  const stack = readAppNavigationStack();
  const nextStack = stack.length ? [...stack.slice(0, -1), path] : [path];
  writeAppNavigationStack(nextStack);
}
