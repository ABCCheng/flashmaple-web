"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";

import {
  defaultLocale,
  dictionaries,
  getLocaleFromPathname,
  hasLocalePrefix,
  localizePath,
  stripLocaleFromPathname,
  type Locale,
} from "@/lib/i18n";
import { getPreferredLocale } from "@/lib/stores/locale";

type LocaleContextValue = {
  locale: Locale;
  dictionary: (typeof dictionaries)[Locale];
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  dictionary: dictionaries[defaultLocale],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);

  const preferredLocalePath = useCallback(() => {
    if (hasLocalePrefix(pathname)) {
      return null;
    }

    if (pathname.endsWith("/auth") && (searchParams.has("code") || searchParams.has("error"))) {
      return null;
    }

    const preferredLocale = getPreferredLocale();
    if (!preferredLocale || preferredLocale === locale) return null;

    const query = searchParams.toString();
    const path = stripLocaleFromPathname(pathname);
    const nextPath = localizePath(path, preferredLocale, hasLocalePrefix(pathname));
    return query ? `${nextPath}?${query}` : nextPath;
  }, [locale, pathname, searchParams]);

  useLayoutEffect(() => {
    const nextPath = preferredLocalePath();
    if (!nextPath) return;
    window.history.replaceState(null, "", nextPath);
  }, [preferredLocalePath]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const nextPath = preferredLocalePath();
    if (!nextPath) return;
    router.replace(nextPath);
  }, [preferredLocalePath, router]);

  const value = useMemo(
    () => ({ locale, dictionary: dictionaries[locale] }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  return useContext(LocaleContext);
}
