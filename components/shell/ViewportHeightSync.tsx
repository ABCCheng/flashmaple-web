"use client";

import { useEffect } from "react";

import { markAppSplashReady } from "@/lib/app-splash";

// Mobile browser chrome and system sheets settle the layout viewport in stages.
// These follow-up passes prevent a stale page height after they close.
const settledSyncDelays = [250, 800];

function applyViewportHeight() {
  // visualViewport can temporarily shrink for browser overlays; innerHeight
  // reflects the layout area that should remain scrollable after they close.
  const height = window.innerHeight;
  if (!Number.isFinite(height) || height <= 0) return;

  document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
}

export function ViewportHeightSync() {
  useEffect(() => {
    let frame = 0;
    let timers: number[] = [];
    const splashReadyTimer = window.setTimeout(() => {
      markAppSplashReady("viewport");
    }, 800);

    const clearScheduledSyncs = () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const scheduleSync = () => {
      clearScheduledSyncs();
      frame = window.requestAnimationFrame(applyViewportHeight);
      timers = settledSyncDelays.map((delay) => window.setTimeout(applyViewportHeight, delay));
    };

    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") scheduleSync();
    };

    scheduleSync();
    window.addEventListener("resize", scheduleSync);
    window.addEventListener("orientationchange", scheduleSync);
    window.addEventListener("pageshow", scheduleSync);
    window.addEventListener("focus", scheduleSync);
    document.addEventListener("visibilitychange", syncWhenVisible);
    window.visualViewport?.addEventListener("resize", scheduleSync);

    return () => {
      clearScheduledSyncs();
      window.clearTimeout(splashReadyTimer);
      window.removeEventListener("resize", scheduleSync);
      window.removeEventListener("orientationchange", scheduleSync);
      window.removeEventListener("pageshow", scheduleSync);
      window.removeEventListener("focus", scheduleSync);
      document.removeEventListener("visibilitychange", syncWhenVisible);
      window.visualViewport?.removeEventListener("resize", scheduleSync);
    };
  }, []);

  return null;
}
