"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  APP_THEME_COLORS,
  getStoredThemeMode,
  saveThemeMode,
  subscribeTheme,
  type ThemeMode,
} from "@/lib/stores/theme";

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "system",
  setThemeMode: () => {},
  isDark: false,
});

function getSystemIsDark() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isMobileWebBrowser() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;

  return window.matchMedia("(max-width: 767px)").matches && !isStandalone;
}

function applyThemeToDocument(themeMode: ThemeMode, isDark: boolean) {
  const themeColor = isDark ? APP_THEME_COLORS.dark : APP_THEME_COLORS.light;
  document.documentElement.dataset.themeMode = themeMode;
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  document.documentElement.style.setProperty("--app-safe-top-color", themeColor);
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", themeColor);
  });

  if (isMobileWebBrowser()) {
    document.documentElement.style.backgroundColor = themeColor;
    document.body.style.backgroundColor = themeColor;
  } else {
    document.documentElement.style.removeProperty("background-color");
    document.body.style.removeProperty("background-color");
  }
}

function getThemeSnapshot() {
  const themeMode = getStoredThemeMode();
  const isDark = themeMode === "system" ? getSystemIsDark() : themeMode === "dark";
  return `${themeMode}:${isDark ? "1" : "0"}`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "system:0");
  const [themeModeValue, darkValue] = snapshot.split(":");
  const themeMode: ThemeMode =
    themeModeValue === "light" || themeModeValue === "dark" ? themeModeValue : "system";
  const isDark = darkValue === "1";

  useEffect(() => {
    applyThemeToDocument(themeMode, isDark);
  }, [isDark, themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    applyThemeToDocument(mode, mode === "system" ? getSystemIsDark() : mode === "dark");
    saveThemeMode(mode);
  }, []);

  const value = useMemo(
    () => ({ themeMode, setThemeMode, isDark }),
    [isDark, setThemeMode, themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
