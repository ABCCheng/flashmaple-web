"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DesktopAppHeader } from "@/components/shell/DesktopAppHeader";
import { useRegionContext } from "@/components/providers/region-provider";
import { activateDevice, getProfile } from "@/lib/api/user";
import { initializeAppNavigationStack, rememberAppNavigationPath } from "@/lib/stores/app-session";
import {
  dictionaries,
  getLocaleFromPathname,
  hasLocalePrefix,
  stripLocaleFromPathname,
} from "@/lib/i18n";
import { subscribeAuthStateChanged } from "@/lib/stores/auth-events";
import { getUserInfo, hasAuthHint, isAuthenticated, saveUserInfo } from "@/lib/stores/auth-user";
import { cn } from "@/lib/utils";
import {
  getServiceWorkerContainer,
  syncCurrentWebPushSubscription,
} from "@/lib/web-push-client";
import { markWebPushMessageRead } from "@/lib/stores/web-push-messages";
import { buildSiteTitle } from "@/lib/seo";
import { markAppSplashReady } from "@/lib/app-splash";
import { AppMobileBottomTab } from "../app";

function getRegistrableServiceWorker() {
  const serviceWorker = getServiceWorkerContainer();
  if (!serviceWorker) return null;

  return window.location.protocol === "https:" || window.location.hostname === "localhost"
    ? serviceWorker
    : null;
}

function isStandaloneApp() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function scheduleNonCriticalStartup(callback: () => void) {
  const idleWindow = window as IdleCallbackWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2000 });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 800);
  return () => window.clearTimeout(handle);
}

const pwaEdgeGestureClass = "app-pwa-top-route";
const pwaEdgeGestureWidth = 24;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);
  const keepLocalePrefix = hasLocalePrefix(pathname);
  const dictionary = dictionaries[locale];
  const { region } = useRegionContext();
  const currentPath = stripLocaleFromPathname(pathname);
  const activeExploreTab = searchParams.get("tab") || "local";
  const isSearchResult = Boolean(searchParams.get("q")?.trim());
  const navigationPath = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const isLoggedIn = useSyncExternalStore(
    subscribeAuthStateChanged,
    isAuthenticated,
    () => false,
  );

  const syncAuthState = useCallback(() => {
    const user = getUserInfo();
    setDisplayName(user?.userName?.trim() || "");
    setAvatar(user?.avatarType === "IMAGE_URL" ? user.avatar : null);
  }, []);

  useEffect(() => {
    return scheduleNonCriticalStartup(() => {
      void activateDevice()
        .catch((error) => {
          console.warn("Device initialization failed", error);
        })
        .finally(() => {
          const serviceWorker = getRegistrableServiceWorker();
          if (serviceWorker) {
            void serviceWorker.register("/sw.js", { scope: "/app/", updateViaCache: "none" }).catch((error) => {
              console.warn("Service worker registration failed", error);
            });
          }
        });
    });
  }, []);

  useEffect(() => {
    const serviceWorker = getRegistrableServiceWorker();
    if (!serviceWorker) return;

    const syncPushPreferences = () => {
      void serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: "flashmaple:push-preferences",
          languageCode: locale,
          region,
        });
      }).catch((error) => {
        console.warn("Push preference sync failed", error);
      });
    };

    syncPushPreferences();
    serviceWorker.addEventListener("controllerchange", syncPushPreferences);
    return () => {
      serviceWorker.removeEventListener("controllerchange", syncPushPreferences);
    };
  }, [locale, region]);

  useEffect(() => {
    const serviceWorker = getRegistrableServiceWorker();
    if (!serviceWorker) return;

    let syncInFlight: Promise<void> | null = null;

    const syncPushSubscription = (reason: string) => {
      if (syncInFlight) return;

      syncInFlight = syncCurrentWebPushSubscription()
        .then((result) => {
          console.info("[web-push] subscription sync", { reason, ...result });
        })
        .catch((error) => {
          console.warn("[web-push] subscription sync failed", { reason, error });
        })
        .finally(() => {
          syncInFlight = null;
        });
    };

    const handleControllerChange = () => syncPushSubscription("controllerchange");
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "flashmaple:push-subscription-change") {
        syncPushSubscription("pushsubscriptionchange");
      }
    };

    syncPushSubscription("startup");
    serviceWorker.addEventListener("controllerchange", handleControllerChange);
    serviceWorker.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    const desktopMedia = window.matchMedia("(min-width: 768px)");
    let cancelled = false;

    const syncDesktopProfile = () => {
      if (!desktopMedia.matches || !hasAuthHint()) {
        syncAuthState();
        return;
      }

      void getProfile({ silent: true }).then((profile) => {
        if (cancelled) return;
        if (profile?.code === 200 && profile.data) {
          saveUserInfo(profile.data);
        } else {
          syncAuthState();
        }
      });
    };

    syncDesktopProfile();
    desktopMedia.addEventListener("change", syncDesktopProfile);
    return () => {
      cancelled = true;
      desktopMedia.removeEventListener("change", syncDesktopProfile);
    };
  }, [syncAuthState]);

  useEffect(() => {
    const serviceWorker = getServiceWorkerContainer();
    if (!serviceWorker) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "flashmaple:notification-navigation") return;

      if (typeof event.data.messageId === "string") {
        void markWebPushMessageRead(event.data.messageId);
      }

      try {
        const targetUrl = new URL(event.data.url, window.location.origin);
        if (targetUrl.origin !== window.location.origin) return;
        router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
      } catch {
        // Ignore malformed notification URLs.
      }
    };

    serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [router]);

  useEffect(() => {
    return subscribeAuthStateChanged(syncAuthState);
  }, [syncAuthState]);

  const mobileTopRoutes = ["/", "/news", "/favorites", "/profile"];
  // const showMobileBackHeader = !mobileTopRoutes.includes(currentPath);
  const showMobileTab = mobileTopRoutes.includes(currentPath);
  const keepMobileTabSpacing = showMobileTab || currentPath === "/news/detail";

  useLayoutEffect(() => {
    const pageTitle = {
      "/": dictionary.tabs.flash,
      "/news": dictionary.tabs.explore,
      "/favorites": dictionary.tabs.favorites,
      "/profile": dictionary.tabs.profile,
      "/settings": dictionary.profile.sections.setting,
      "/about": dictionary.profile.sections.about,
      "/web-push": dictionary.webPushPage.title,
      "/auth": dictionary.auth.titleLogin,
    }[currentPath];

    // News detail owns its title because it includes the active article title.
    if (pageTitle) {
      document.title = buildSiteTitle(pageTitle);
    }
  }, [currentPath, dictionary]);

  useLayoutEffect(() => {
    document.documentElement.classList.add("app-shell-active");
    return () => document.documentElement.classList.remove("app-shell-active");
  }, []);

  useEffect(() => {
    if (!showMobileTab || !isStandaloneApp()) return;

    document.documentElement.classList.add(pwaEdgeGestureClass);

    const preventPwaEdgeNavigation = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touchX = event.touches[0]?.clientX;
      if (touchX === undefined) return;

      const startedAtNavigationEdge =
        touchX <= pwaEdgeGestureWidth || touchX >= window.innerWidth - pwaEdgeGestureWidth;
      if (startedAtNavigationEdge && event.cancelable) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchstart", preventPwaEdgeNavigation, { passive: false });
    return () => {
      document.documentElement.classList.remove(pwaEdgeGestureClass);
      document.removeEventListener("touchstart", preventPwaEdgeNavigation);
    };
  }, [showMobileTab]);

  useLayoutEffect(() => {
    initializeAppNavigationStack(navigationPath);
    rememberAppNavigationPath(navigationPath);
  }, [navigationPath]);

  useEffect(() => {
    const content = document.querySelector<HTMLElement>(".app-content-inner");
    if (!content) return;

    let firstFrame = 0;
    let secondFrame = 0;

    const hasVisibleLoadingOverlay = () => Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="app-loading-overlay"]')
    ).some((overlay) => {
      const style = window.getComputedStyle(overlay);
      return style.display !== "none" && style.visibility !== "hidden";
    });

    const hasMountedPage = () => content.children.length > 0;

    const cancelReadyFrames = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };

    const checkContentReady = () => {
      cancelReadyFrames();
      if (!hasMountedPage() || hasVisibleLoadingOverlay()) return;

      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (hasMountedPage() && !hasVisibleLoadingOverlay()) {
            markAppSplashReady("content");
          }
        });
      });
    };

    const observer = new MutationObserver(checkContentReady);
    observer.observe(content, { childList: true, subtree: true });
    checkContentReady();

    return () => {
      observer.disconnect();
      cancelReadyFrames();
    };
  }, []);

  return (
    <div className="app-root flex w-full flex-col bg-transparent md:h-dvh md:overflow-hidden">
      <DesktopAppHeader
        locale={locale}
        keepLocalePrefix={keepLocalePrefix}
        dictionary={dictionary}
        currentPath={currentPath}
        activeExploreTab={activeExploreTab}
        isSearchResult={isSearchResult}
        isLoggedIn={isLoggedIn}
        displayName={displayName}
        avatar={avatar}
      />
      <main
        className={cn(
          "app-content w-full min-h-0 flex-1 overflow-y-auto overscroll-y-auto bg-transparent",
          keepMobileTabSpacing ? "pb-(--app-safe-tab-bottom)" : "pb-(--app-safe-footer-bottom)"
        )}
      >
        <div
          className={cn(
            "app-content-inner min-h-[calc(100%+1px)] w-full md:mx-auto md:w-[min(100%,840px)]"
          )}
        >
          {children}
        </div>
      </main>
      {showMobileTab ? <AppMobileBottomTab /> : null}
    </div>
  );
}
