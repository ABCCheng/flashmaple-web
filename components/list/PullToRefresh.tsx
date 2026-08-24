"use client";

import { RefreshCw } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

import { useLocaleContext } from "@/components/providers/locale-provider";
import { getAppScrollRoot } from "@/lib/app-scroll";
import { cn } from "@/lib/utils";

const PULL_HINT_DISTANCE = 20;
const PULL_REFRESH_DISTANCE = 80;
const PULL_MAX_DISTANCE = 200;
const AXIS_LOCK_DISTANCE = 20;
const REFRESH_HOLD_DISTANCE = 58;
const DESKTOP_PULL_MEDIA_QUERY = "(min-width: 768px)";

type PullToRefreshOptions = {
  disabled?: boolean;
  refreshing?: boolean;
  onRefresh: () => void | Promise<void>;
};

export type PullToRefreshState = ReturnType<typeof usePullToRefresh>;

function dampPullDistance(distance: number) {
  if (distance <= PULL_REFRESH_DISTANCE) return distance;
  return Math.min(
    PULL_MAX_DISTANCE,
    PULL_REFRESH_DISTANCE + (distance - PULL_REFRESH_DISTANCE) * 0.36
  );
}

function getScrollTop() {
  const root = getAppScrollRoot();
  if (!root) return 0;
  if (root === document.scrollingElement) {
    return window.scrollY || root.scrollTop || 0;
  }
  return root.scrollTop;
}

function isDesktopPullDisabled() {
  return window.matchMedia(DESKTOP_PULL_MEDIA_QUERY).matches;
}

export function usePullToRefresh({
  disabled,
  refreshing,
  onRefresh,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [settling, setSettling] = useState(false);
  const [refreshingFromPull, setRefreshingFromPull] = useState(false);
  const isRefreshing = Boolean(refreshing) || refreshingFromPull;
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const axisRef = useRef<"horizontal" | "vertical" | null>(null);
  const settlingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousRefreshingRef = useRef(isRefreshing);

  useEffect(() => {
    return () => {
      if (settlingTimerRef.current) {
        clearTimeout(settlingTimerRef.current);
      }
    };
  }, []);

  function resetPullState() {
    startXRef.current = null;
    startYRef.current = null;
    axisRef.current = null;
  }

  const releasePull = useCallback((nextDistance = 0) => {
    setSettling(true);
    setPullDistance(nextDistance);
    if (settlingTimerRef.current) {
      clearTimeout(settlingTimerRef.current);
    }
    settlingTimerRef.current = setTimeout(() => {
      setSettling(false);
    }, 360);
  }, []);

  const resetPull = useCallback(() => {
    resetPullState();
    setPullDistance(0);
    setSettling(false);
    setRefreshingFromPull(false);
    if (settlingTimerRef.current) {
      clearTimeout(settlingTimerRef.current);
      settlingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const wasRefreshing = previousRefreshingRef.current;
    previousRefreshingRef.current = isRefreshing;
    if (wasRefreshing && !isRefreshing) {
      releasePull(0);
    }
  }, [isRefreshing, releasePull]);

  function clearPull() {
    resetPullState();
    setPullDistance(0);
  }

  function onTouchStart(event: TouchEvent) {
    if (disabled || isRefreshing || isDesktopPullDisabled() || getScrollTop() > 0) {
      clearPull();
      return;
    }

    setSettling(false);
    startXRef.current = event.touches[0]?.clientX ?? null;
    startYRef.current = event.touches[0]?.clientY ?? null;
    axisRef.current = null;
  }

  function onTouchMove(event: TouchEvent) {
    if (disabled || isRefreshing || isDesktopPullDisabled() || startXRef.current === null || startYRef.current === null) return;
    if (getScrollTop() > 0) {
      clearPull();
      return;
    }

    const currentX = event.touches[0]?.clientX ?? startXRef.current;
    const currentY = event.touches[0]?.clientY ?? startYRef.current;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (!axisRef.current && Math.max(absX, absY) >= AXIS_LOCK_DISTANCE) {
      axisRef.current = absX > absY * 1.15 ? "horizontal" : "vertical";
    }

    if (axisRef.current === "horizontal" || deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    setPullDistance(dampPullDistance(deltaY));
  }

  function onTouchEnd() {
    const shouldRefresh =
      pullDistance >= PULL_REFRESH_DISTANCE &&
      !disabled &&
      !isRefreshing &&
      !isDesktopPullDisabled();
    resetPullState();
    if (shouldRefresh) {
      setRefreshingFromPull(true);
      releasePull(REFRESH_HOLD_DISTANCE);
      void Promise.resolve(onRefresh()).finally(() => {
        setRefreshingFromPull(false);
        releasePull(0);
      });
      return;
    }
    releasePull(0);
  }

  const visualPullDistance = isRefreshing ? REFRESH_HOLD_DISTANCE : pullDistance;

  return {
    pullDistance: visualPullDistance,
    settling,
    refreshing: isRefreshing,
    resetPull,
    shouldShowPullIndicator: visualPullDistance > PULL_HINT_DISTANCE || isRefreshing,
    isReleaseReady: visualPullDistance >= PULL_REFRESH_DISTANCE,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: () => {
        resetPullState();
        releasePull(0);
      },
    },
  };
}

export function PullToRefreshSurface({
  className,
  style,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="pull-to-refresh-surface"
      className={className}
      style={style}
      {...props}
    />
  );
}

export function PullToRefreshIndicator({
  state,
  pullDistance,
  releaseReady,
  refreshing,
  className,
}: {
  state?: PullToRefreshState;
  pullDistance?: number;
  releaseReady?: boolean;
  refreshing?: boolean;
  className?: string;
}) {
  const { dictionary } = useLocaleContext();
  const nextPullDistance = state?.pullDistance ?? pullDistance ?? 0;
  const nextReleaseReady = state?.isReleaseReady ?? releaseReady ?? false;
  const nextRefreshing = state?.refreshing ?? refreshing ?? false;
  const indicatorHeight = Math.max(32, Math.min(nextPullDistance, 72));
  const label: ReactNode = nextRefreshing
    ? dictionary.feed.refreshing
    : nextReleaseReady
      ? dictionary.feed.releaseToRefresh
      : dictionary.feed.pullToRefresh;

  return (
    <div
      className={cn(
        "flex h-8 items-center justify-center gap-2 text-xs font-medium text-muted-foreground md:hidden",
        className
      )}
      style={{
        height: indicatorHeight,
        transform: "translateY(0)",
        transition: state?.settling || nextRefreshing
          ? "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)"
          : undefined,
        opacity: Math.min(1, Math.max(0.45, nextPullDistance / PULL_REFRESH_DISTANCE)),
      }}
    >
      <RefreshCw className={cn("size-4", (nextRefreshing || nextReleaseReady) && "animate-spin text-primary")} />
      {label}
    </div>
  );
}
