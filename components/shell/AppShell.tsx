"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DesktopAppHeader } from "@/components/shell/DesktopAppHeader";
import { useRegionContext } from "@/components/providers/region-provider";
import { activateDevice, getProfile } from "@/lib/api/user";
import {
  initializeAppNavigationStack,
  rememberAppNavigationPath,
  updateCurrentAppNavigationPath,
} from "@/lib/stores/app-session";
import {
  dictionaries,
  getLocaleFromPathname,
  hasLocalePrefix,
  stripLocaleFromPathname,
} from "@/lib/i18n";
import { subscribeAuthStateChanged } from "@/lib/stores/auth-user";
import { getUserInfo, hasAuthHint, isAuthenticated, saveUserInfo } from "@/lib/stores/auth-user";
import { cn } from "@/lib/class-names";
import {
  getServiceWorkerContainer,
  syncCurrentWebPushSubscription,
} from "@/lib/web-push-client";
import { markWebPushMessageRead } from "@/lib/stores/web-push-messages";
import { buildSiteTitle } from "@/lib/seo";
import { markAppSplashReady } from "@/lib/app-splash";
import { AppMobileBottomTab, useRouterBack } from "../app";

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

const pwaEdgeGestureClass = "app-pwa-edge-guard";
const pwaEdgeGestureWidth = 24;
const notificationLaunchTargetParam = "notificationTarget";

function getNotificationTargetPath(value: string) {
  try {
    const targetUrl = new URL(value, window.location.origin);
    if (targetUrl.origin !== window.location.origin) return null;
    if (stripLocaleFromPathname(targetUrl.pathname) !== "/news/detail") return null;
    if (targetUrl.searchParams.get("source") !== "notification") return null;

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return null;
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const routerBack = useRouterBack();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);
  const keepLocalePrefix = hasLocalePrefix(pathname);
  const dictionary = dictionaries[locale];
  const { region } = useRegionContext();
  const currentPath = stripLocaleFromPathname(pathname);
  const activeExploreTab = searchParams.get("tab") || "local";
  const isSearchResult = Boolean(searchParams.get("q")?.trim());
  const navigationPath = searchParams.size ? `${pathname}?${searchParams.toString()}` : pathname;
  const notificationNavigationActiveRef = useRef(
    currentPath === "/news/detail" && searchParams.get("source") === "notification"
  );
  const notificationNavigationInFlightRef = useRef(false);
  const notificationNavigationTargetRef = useRef<string | null>(null);
  const pendingNotificationTargetRef = useRef<string | null>(null);
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

  const beginNotificationNavigation = useCallback((targetPath: string, replace: boolean) => {
    notificationNavigationActiveRef.current = true;
    notificationNavigationInFlightRef.current = true;
    notificationNavigationTargetRef.current = targetPath;

    if (replace) {
      // Keep the app's lightweight navigation stack aligned with the browser
      // entry that Next.js is about to replace.
      updateCurrentAppNavigationPath(targetPath);
      router.replace(targetPath, { scroll: false });
      return;
    }

    router.push(targetPath, { scroll: false });
  }, [router]);

  const queueNotificationNavigation = useCallback((targetPath: string) => {
    if (notificationNavigationInFlightRef.current) {
      // Notification taps can arrive together when a suspended PWA resumes.
      // Only the newest article should replace the navigation in progress.
      pendingNotificationTargetRef.current = targetPath;
      return;
    }

    const isAlreadyOnNewsDetail =
      stripLocaleFromPathname(window.location.pathname) === "/news/detail";
    beginNotificationNavigation(
      targetPath,
      notificationNavigationActiveRef.current || isAlreadyOnNewsDetail,
    );
  }, [beginNotificationNavigation]);

  useEffect(() => {
    const serviceWorker = getRegistrableServiceWorker();
    if (serviceWorker) {
      void serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(async () => {
          const registration = await serviceWorker.ready;
          registration.active?.postMessage({
            type: "flashmaple:cache-navigation",
            url: window.location.href,
          });
          const assetUrls = Array.from(
            document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
              "script[src], link[rel='stylesheet'][href], link[rel='preload'][href]"
            )
          )
            .map((element) => element.getAttribute("src") || element.getAttribute("href"))
            .filter((url): url is string => Boolean(url));
          registration.active?.postMessage({
            type: "flashmaple:cache-assets",
            urls: assetUrls,
          });
        })
        .catch((error) => {
          console.warn("Service worker registration failed", error);
        });
    }

    const cancelStartup = scheduleNonCriticalStartup(() => {
      void activateDevice().catch((error) => {
        console.warn("Device initialization failed", error);
      });
    });

    return cancelStartup;
  }, []);

  useEffect(() => {
    const launchTarget = searchParams.get(notificationLaunchTargetParam);
    if (!launchTarget) return;

    const targetPath = getNotificationTargetPath(launchTarget);
    const cleanSearchParams = new URLSearchParams(searchParams.toString());
    cleanSearchParams.delete(notificationLaunchTargetParam);
    const cleanQuery = cleanSearchParams.toString();
    const cleanHomePath = `${pathname}${cleanQuery ? `?${cleanQuery}` : ""}`;

    // openWindow() created the first browser entry on the localized home
    // route. Clean that entry synchronously, then add the detail entry in the
    // same effect so the cold-launch target cannot be lost between renders.
    updateCurrentAppNavigationPath(cleanHomePath);
    // This effect can run before Next.js patches replaceState during initial
    // hydration. Preserve its internal state so popstate can restore home.
    window.history.replaceState(window.history.state, "", cleanHomePath);

    if (targetPath) {
      queueNotificationNavigation(targetPath);
    }
  }, [pathname, queueNotificationNavigation, searchParams]);

  useEffect(() => {
    const requestedTarget = notificationNavigationTargetRef.current;
    if (!notificationNavigationInFlightRef.current || requestedTarget !== navigationPath) {
      if (currentPath !== "/news/detail") {
        notificationNavigationActiveRef.current = false;
      }
      return;
    }

    notificationNavigationInFlightRef.current = false;
    notificationNavigationTargetRef.current = null;

    const pendingTarget = pendingNotificationTargetRef.current;
    pendingNotificationTargetRef.current = null;
    if (!pendingTarget || pendingTarget === navigationPath) return;

    beginNotificationNavigation(pendingTarget, true);
  }, [beginNotificationNavigation, currentPath, navigationPath]);

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
        const targetPath = getNotificationTargetPath(targetUrl.toString());
        if (!targetPath) return;
        queueNotificationNavigation(targetPath);
      } catch {
        // Ignore malformed notification URLs.
      }
    };

    serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [queueNotificationNavigation]);

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

  useLayoutEffect(() => {
    if (!isStandaloneApp()) return;

    document.documentElement.classList.add(pwaEdgeGestureClass);
    let backTouch: Touch | null = null;
    let swipeSurface: HTMLElement | null = null;
    let swipeAnimation: Animation | null = null;
    let swipeOffset = 0;
    let motionSamples: { x: number; time: number }[] = [];
    let finishingSwipe = false;
    let navigationTimeout = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clearSwipe = () => {
      backTouch = null;
      swipeAnimation?.cancel();
      swipeAnimation = null;
      swipeSurface?.classList.remove("app-pwa-swipe-surface");
      swipeSurface?.style.removeProperty("--app-swipe-x");
      swipeSurface = null;
      swipeOffset = 0;
      motionSamples = [];
      finishingSwipe = false;
      window.clearTimeout(navigationTimeout);
    };

    const sampleMotion = (x: number, time: number) => {
      motionSamples = [...motionSamples.filter((sample) => time - sample.time <= 100), { x, time }].slice(-8);
      const first = motionSamples[0];
      const elapsed = time - first.time;
      return elapsed > 0 ? Math.max(-2, Math.min(2, (x - first.x) / elapsed)) : 0;
    };

    const finishSwipe = (goBack: boolean, releaseVelocity = 0) => {
      backTouch = null;
      const surface = swipeSurface;
      if (!surface || reducedMotion.matches) {
        clearSwipe();
        if (goBack) routerBack();
        return;
      }

      finishingSwipe = true;
      const target = goBack ? window.innerWidth : 0;
      // Critically damped spring: preserve release velocity and settle without
      // overshooting the viewport. These are app-tuned, not UIKit parameters.
      const displacement = swipeOffset - target;
      const frequency = 26;
      const initialVelocity = releaseVelocity * 1000;
      const coefficient = initialVelocity + frequency * displacement;
      const frames: Keyframe[] = [];
      let duration = 0;
      for (let frame = 0; frame <= 72; frame++) {
        const time = frame / 120;
        const decay = Math.exp(-frequency * time);
        const position = target + (displacement + coefficient * time) * decay;
        const velocity = (initialVelocity - frequency * coefficient * time) * decay;
        frames.push({ transform: `translateX(${Math.max(0, Math.min(window.innerWidth, position))}px)` });
        duration = time * 1000;
        const settled = Math.abs(position - target) < 0.5 && Math.abs(velocity) < 5;
        const reachedBoundary = goBack ? position >= target : position <= target;
        if (frame > 0 && (settled || reachedBoundary)) break;
      }
      frames[frames.length - 1] = { transform: `translateX(${target}px)` };
      const animation = surface.animate(
        frames,
        { duration, easing: "linear", fill: "forwards" },
      );
      swipeAnimation = animation;
      void animation.finished.then(() => {
        if (swipeAnimation !== animation) return;
        if (!goBack) {
          clearSwipe();
          return;
        }
        // Keep the outgoing surface offscreen until the route commits. If
        // navigation fails, restore interaction instead of leaving a blank UI.
        navigationTimeout = window.setTimeout(clearSwipe, 2000);
        routerBack();
      }).catch(() => { /* Route changes and cancelled gestures cancel the animation. */ });
    };

    const handleStart = (event: TouchEvent) => {
      if (finishingSwipe) {
        if (event.cancelable) event.preventDefault();
        return;
      }
      if (backTouch) {
        finishSwipe(false);
        return;
      }
      if (event.touches.length !== 1 || !event.cancelable) return;

      const touch = event.touches[0];
      const atLeftEdge = touch.clientX <= pwaEdgeGestureWidth;
      const atRightEdge = touch.clientX >= window.innerWidth - pwaEdgeGestureWidth;
      if (!atLeftEdge && !atRightEdge) return;

      // Native PWA swipes can skip history created without user interaction
      // (such as notification startup). Subpages use the header's Back action.
      event.preventDefault();
      if (atLeftEdge && !showMobileTab) {
        backTouch = touch;
        motionSamples = [{ x: touch.clientX, time: event.timeStamp }];
      }
    };

    const handleMove = (event: TouchEvent) => {
      if (!backTouch) return;
      const touch = event.touches[0];
      if (event.touches.length !== 1 || touch.identifier !== backTouch.identifier) {
        finishSwipe(false);
        return;
      }

      const dx = touch.clientX - backTouch.clientX;
      const dy = Math.abs(touch.clientY - backTouch.clientY);
      sampleMotion(touch.clientX, event.timeStamp);
      // A vertical scroll must not later turn into a back swipe.
      if (dy > 12 && dy > Math.abs(dx)) {
        finishSwipe(false);
        return;
      }
      if (reducedMotion.matches || (!swipeSurface && (dx <= 6 || dx < dy * 1.5))) return;

      if (!swipeSurface) {
        // Animate a viewport wrapper, not the scrolling layer: fixed headers
        // must stay at the top even when the article is scrolled down.
        swipeSurface = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="app-route-surface"]')).at(-1)
          ?? document.querySelector<HTMLElement>(".app-root");
        swipeSurface?.classList.add("app-pwa-swipe-surface");
      }
      swipeOffset = Math.min(Math.max(0, dx), window.innerWidth);
      swipeSurface?.style.setProperty("--app-swipe-x", `${swipeOffset}px`);
    };

    const handleEnd = (event: TouchEvent) => {
      const start = backTouch;
      if (!start) return;
      if (event.touches.length) {
        finishSwipe(false);
        return;
      }

      const touch = Array.from(event.changedTouches).find((item) => item.identifier === start.identifier);
      if (!touch) {
        finishSwipe(false);
        return;
      }

      const dx = touch.clientX - start.clientX;
      const dy = Math.abs(touch.clientY - start.clientY);
      const releaseVelocity = sampleMotion(touch.clientX, event.timeStamp);
      if (swipeSurface) {
        swipeOffset = Math.min(Math.max(0, dx), window.innerWidth);
        swipeSurface.style.setProperty("--app-swipe-x", `${swipeOffset}px`);
      }
      // A slow drag is only a preview until the finger reaches the far edge.
      // Otherwise require a deliberate forward flick (velocity is px/ms).
      const reachedRightEdge = touch.clientX >= window.innerWidth - 12;
      const flickedBack = dx >= 40 && releaseVelocity >= 0.65;
      if (dx <= 0 || dx < dy * 1.5 || releaseVelocity < -0.25 || (!reachedRightEdge && !flickedBack)) {
        finishSwipe(false, releaseVelocity);
        return;
      }

      if (event.cancelable) event.preventDefault();
      finishSwipe(true, releaseVelocity);
    };
    const handleCancel = () => { if (!finishingSwipe) finishSwipe(false); };

    document.addEventListener("touchstart", handleStart, { passive: false, capture: true });
    document.addEventListener("touchmove", handleMove, { passive: true, capture: true });
    document.addEventListener("touchend", handleEnd, { passive: false, capture: true });
    document.addEventListener("touchcancel", handleCancel, { passive: true, capture: true });
    return () => {
      clearSwipe();
      document.documentElement.classList.remove(pwaEdgeGestureClass);
      document.removeEventListener("touchstart", handleStart, { capture: true });
      document.removeEventListener("touchmove", handleMove, { capture: true });
      document.removeEventListener("touchend", handleEnd, { capture: true });
      document.removeEventListener("touchcancel", handleCancel, { capture: true });
    };
  }, [routerBack, showMobileTab, navigationPath]);

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
          "app-content w-full min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-transparent",
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
