import { defaultLocale, normalizeLocale, type Locale } from "@/lib/i18n";

import { readStorage, writeStorage } from "./storage";

const LOCALE_STORAGE_KEY = "FLASH_MAPLE_LOCALE";

export function getPreferredLocale() {
  const stored = readStorage(LOCALE_STORAGE_KEY);
  return normalizeLocale(stored);
}

export function savePreferredLocale(locale: Locale) {
  writeStorage(LOCALE_STORAGE_KEY, locale || defaultLocale);
}
