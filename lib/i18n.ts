import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import pa from "@/messages/pa.json";
import ru from "@/messages/ru.json";
import vi from "@/messages/vi.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

const localeDefinitions = [
  { code: "en", name: "English", dictionary: en },
  { code: "fr", name: "Français", dictionary: fr },
  { code: "zh-Hans", name: "简体中文", dictionary: zhHans },
  { code: "zh-Hant", name: "繁体中文", dictionary: zhHant },
  { code: "pa", name: "Punjabi", dictionary: pa },
  { code: "es", name: "Spanish", dictionary: es },
  { code: "ja", name: "日本語", dictionary: ja },
  { code: "ko", name: "한국어", dictionary: ko },
  { code: "ru", name: "Русский", dictionary: ru },
  { code: "vi", name: "Tiếng Việt", dictionary: vi },
] as const;

export type Locale = (typeof localeDefinitions)[number]["code"];

export const defaultLocale: Locale = "en";

export const locales: Locale[] = localeDefinitions.map(({ code }) => code);

export const localeNames = Object.fromEntries(
  localeDefinitions.map(({ code, name }) => [code, name])
) as Record<Locale, string>;

export const dictionaries = Object.fromEntries(
  localeDefinitions.map(({ code, dictionary }) => [code, dictionary])
) as Record<Locale, typeof en>;

export type Dictionary = (typeof dictionaries)[Locale];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  if (isLocale(value)) return value;
  return null;
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  return normalizeLocale(segments[0]) ?? (segments[0] === "app" ? normalizeLocale(segments[1]) : null) ?? defaultLocale;
}

export function hasLocalePrefix(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return Boolean(normalizeLocale(segments[0]) || (segments[0] === "app" && normalizeLocale(segments[1])));
}

export function stripLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  const localeIndex = normalizeLocale(segments[0]) ? 0 : segments[0] === "app" && normalizeLocale(segments[1]) ? 1 : -1;

  if (localeIndex >= 0) {
    const path = `/${segments.slice(localeIndex + 1).join("/")}`;
    return path === "/" ? "/" : path.replace(/\/$/, "");
  }

  return pathname === "" ? "/" : pathname;
}

export function localizePath(path: string, locale: Locale, _forcePrefix = false) {
  void _forcePrefix;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath === "/"
    ? `/app/${locale}`
    : `/app/${locale}${normalizedPath}`;
}

export function homePath(path: string, locale: Locale) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale && normalizedPath === "/") return "/";
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function t(dict: Dictionary, path: string, params?: Record<string, string | number>) {
  const value = path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);

  if (typeof value !== "string") {
    return path;
  }

  return Object.entries(params ?? {}).reduce(
    (text, [key, param]) => text.replaceAll(`{{${key}}}`, String(param)),
    value
  );
}
