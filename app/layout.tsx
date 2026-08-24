import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { AppSplashScreen } from "@/components/shell/AppSplashScreen";
import { ViewportHeightSync } from "@/components/shell/ViewportHeightSync";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SnackbarProvider } from "@/components/providers/snackbar-provider";
import { defaultLocale, dictionaries, locales } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { APP_SPLASH_SESSION_KEY } from "@/lib/stores/app-session";
import { APP_THEME_COLORS, THEME_STORAGE_KEY } from "@/lib/stores/theme";
import { MOOD_STORAGE_KEY, MOOD_THEME_STORAGE_KEY } from "@/lib/stores/mood";

import "./globals.css";

const GA_MEASUREMENT_ID = "G-5W4NP3F1EY";
const INITIAL_PREFERENCES_SCRIPT = `
  (() => {
    const root = document.documentElement;
    const themeColors = ${JSON.stringify(APP_THEME_COLORS)};
    const homeLocales = ${JSON.stringify(locales)};
    const normalizedPath = window.location.pathname.replace(/\\/+$/, "") || "/";
    const isHomeSurface = normalizedPath === "/" ||
      homeLocales.some((locale) => normalizedPath === "/" + locale);
    root.classList.toggle("home-surface", isHomeSurface);
    let themeMode = "system";
    let moodThemeEnabled = false;
    let mood = "positive";

    try {
      const storedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
        themeMode = storedTheme;
      }
      moodThemeEnabled = localStorage.getItem(${JSON.stringify(MOOD_THEME_STORAGE_KEY)}) === "1";
      const storedMood = localStorage.getItem(${JSON.stringify(MOOD_STORAGE_KEY)});
      if (storedMood === "positive" || storedMood === "neutral" || storedMood === "negative") {
        mood = storedMood;
      }
    } catch {}

    const systemIsDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const isDark = themeMode === "dark" || (themeMode === "system" && systemIsDark);
    root.dataset.themeMode = themeMode;
    root.classList.toggle("dark", isDark);
    const isStandalone = window.matchMedia?.("(display-mode: standalone)").matches ||
      navigator.standalone === true;
    root.classList.toggle("app-standalone", isStandalone);
    const isMobileStandalone = window.matchMedia?.("(max-width: 767px)").matches && isStandalone;
    const isAppPath = normalizedPath === "/app" || normalizedPath.startsWith("/app/");
    root.classList.toggle("app-shell-active", isAppPath);
    if (isMobileStandalone && Number.isFinite(window.innerHeight) && window.innerHeight > 0) {
      root.style.setProperty("--app-viewport-height", window.innerHeight + "px");
    }
    let splashWasShown = false;
    try {
      splashWasShown = sessionStorage.getItem(${JSON.stringify(APP_SPLASH_SESSION_KEY)}) === "1";
    } catch {}
    const showAppSplash = isMobileStandalone && isAppPath && !splashWasShown;
    root.dataset.showAppSplash = showAppSplash ? "true" : "false";
    if (showAppSplash) {
      try {
        sessionStorage.setItem(${JSON.stringify(APP_SPLASH_SESSION_KEY)}, "1");
      } catch {}
    }

    const activeThemeColor = isDark ? themeColors.dark : themeColors.light;
    root.style.setProperty("--app-safe-top-color", activeThemeColor);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute("media");
      meta.setAttribute("content", activeThemeColor);
    });
    const isMobileWeb = window.matchMedia?.("(max-width: 767px)").matches && !isStandalone;
    if (isMobileWeb) {
      root.style.backgroundColor = activeThemeColor;
    }

    const callbackParams = new URLSearchParams(window.location.search);
    const callbackPath = window.location.pathname.endsWith("/")
      ? window.location.pathname.slice(0, -1)
      : window.location.pathname;
    const authCallback = callbackPath.endsWith("/auth") &&
      (callbackParams.has("code") || callbackParams.has("error"));
    if (authCallback) {
      root.dataset.skipAppSplash = "true";
      root.dataset.showAppSplash = "false";
    }

    root.style.colorScheme = isDark ? "dark" : "light";
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "auto";
    }
    root.dataset.appSplashStartedAt = String(Date.now());
    root.dataset.mood = mood;
    root.dataset.moodTheme = moodThemeEnabled ? "on" : "off";

  })();
`;
const defaultHomeContent = dictionaries[defaultLocale].homePage;
const defaultTitle = defaultHomeContent.seoTitle;
const defaultDescription = defaultHomeContent.seoDescription;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: defaultTitle,
    template: "%s",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: defaultTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
      description: defaultDescription,
    images: ["/og.png"],
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "256x256", type: "image/png" },
    ],
    shortcut: "/favicon.ico",

    apple: [
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ]
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: APP_THEME_COLORS.dark },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang={defaultLocale} className="h-full" data-theme-mode="system" suppressHydrationWarning>
      <head>
        <script
          id="initial-app-preferences"
          dangerouslySetInnerHTML={{ __html: INITIAL_PREFERENCES_SCRIPT }}
        />
      </head>
      <body>
        <ViewportHeightSync />
        <AppSplashScreen />
        <SnackbarProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SnackbarProvider>
      </body>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </html>
  );
}
