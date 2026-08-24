import { readStorage, writeStorage } from "./storage";

export type MoodType = "positive" | "neutral" | "negative";

export const MOOD_STORAGE_KEY = "FLASH_MAPLE_MOOD";
export const MOOD_THEME_STORAGE_KEY = "FLASH_MAPLE_MOOD_THEME_ENABLED";
export const MOOD_THEME_CHANGE_EVENT = "flashmaple:mood-theme-change";

let volatileMoodThemeEnabled = false;

export function normalizeMood(value: string | null | undefined): MoodType {
  return value === "neutral" || value === "negative" || value === "positive"
    ? value
    : "positive";
}

export function getStoredMood(): MoodType {
  return normalizeMood(readStorage(MOOD_STORAGE_KEY));
}

export function saveMood(value: string | null | undefined) {
  writeStorage(MOOD_STORAGE_KEY, normalizeMood(value));
}

export function getStoredMoodThemeEnabled() {
  if (typeof window === "undefined") return false;

  const stored = readStorage(MOOD_THEME_STORAGE_KEY);
  return stored === null ? volatileMoodThemeEnabled : stored === "1";
}

export function saveMoodThemeEnabled(enabled: boolean) {
  volatileMoodThemeEnabled = enabled;
  writeStorage(MOOD_THEME_STORAGE_KEY, enabled ? "1" : "0");
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MOOD_THEME_CHANGE_EVENT));
}

export function subscribeMoodTheme(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === MOOD_THEME_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(MOOD_THEME_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(MOOD_THEME_CHANGE_EVENT, listener);
  };
}
