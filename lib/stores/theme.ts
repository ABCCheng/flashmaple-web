import { readStorage, writeStorage } from "./storage";

export const APP_THEME_COLORS = {
  light: "#ffffff",
  dark: "#1b1b1f",
} as const;

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "FLASH_MAPLE_THEME_MODE";
export const THEME_CHANGE_EVENT = "flashmaple:theme-change";

let volatileThemeMode: ThemeMode | null = null;

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const value = readStorage(THEME_STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : volatileThemeMode ?? "system";
}

export function saveThemeMode(mode: ThemeMode) {
  volatileThemeMode = mode;
  writeStorage(THEME_STORAGE_KEY, mode);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function subscribeTheme(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  media.addEventListener("change", listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    media.removeEventListener("change", listener);
  };
}
