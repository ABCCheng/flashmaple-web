import { defaultLocale, normalizeLocale, type Locale } from "@/lib/i18n";

import { readStorage, writeStorage } from "./storage";

const preferredLocaleKey = "FLASH_MAPLE_LOCALE";

export function getPreferredLocale() {
  const stored = readStorage(preferredLocaleKey);
  return normalizeLocale(stored);
}

export function savePreferredLocale(locale: Locale) {
  writeStorage(preferredLocaleKey, locale || defaultLocale);
}
