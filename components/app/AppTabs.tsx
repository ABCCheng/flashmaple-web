"use client";

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { appZIndex } from "@/lib/z-index";

export type AppTabItem<T extends string> = {
  key: T;
  label: string;
};

export function AppSlidingTabs<T extends string>({
  tabs,
  activeKey,
  ariaLabel,
  onSelect,
  className,
  idPrefix,
}: {
  tabs: Array<AppTabItem<T>>;
  activeKey: T;
  ariaLabel: string;
  onSelect: (key: T) => void;
  className?: string;
  idPrefix?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});
  const indicatorMeasuredRef = useRef(false);
  const [activeIndicator, setActiveIndicator] = useState<{ left: number; width: number } | null>(null);
  const [animateIndicator, setAnimateIndicator] = useState(false);

  const updateActiveIndicator = useCallback(() => {
    const activeButton = tabRefs.current[activeKey];
    if (!activeButton) return;
    const scroller = scrollerRef.current;

    setAnimateIndicator(indicatorMeasuredRef.current);
    setActiveIndicator({
      left: activeButton.offsetLeft,
      width: activeButton.offsetWidth,
    });
    indicatorMeasuredRef.current = true;

    scroller?.scrollTo({
      left: activeButton.offsetLeft - (scroller.clientWidth - activeButton.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [activeKey]);

  useLayoutEffect(() => {
    updateActiveIndicator();
  }, [tabs, updateActiveIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateActiveIndicator);
    return () => window.removeEventListener("resize", updateActiveIndicator);
  }, [updateActiveIndicator]);

  function handleTabKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onSelect(nextTab.key);
    window.requestAnimationFrame(() => tabRefs.current[nextTab.key]?.focus());
  }

  return (
    <div
      ref={scrollerRef}
      data-mobile-tabs
      data-slot="app-sliding-tabs"
      className={cn(
        "w-full min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap overscroll-x-contain [scroll-snap-type:x_proximity]",
        !activeIndicator && "opacity-0",
        activeIndicator && "opacity-100",
        className
      )}
      style={{ scrollBehavior: "auto" }}
    >
      <div role="tablist" aria-label={ariaLabel} className="relative flex w-max min-w-full items-center justify-center gap-5">
        {activeIndicator ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-primary",
              animateIndicator && "transition-[transform,width] duration-300 ease-out"
            )}
            style={{
              width: activeIndicator.width,
              transform: `translateX(${activeIndicator.left}px)`,
            }}
          />
        ) : null}
        {tabs.map((tab, index) => (
          <button
            ref={(node) => {
              tabRefs.current[tab.key] = node;
            }}
            key={tab.key}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${tab.key}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${tab.key}` : undefined}
            aria-selected={activeKey === tab.key}
            tabIndex={activeKey === tab.key ? 0 : -1}
            onClick={() => onSelect(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={cn(
              "relative h-6 shrink-0 snap-start border-0 bg-transparent px-0 text-md font-semibold text-muted-foreground transition",
              appZIndex.content,
              activeKey === tab.key ? "text-primary" : "hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppTabbedHeader<T extends string>({
  tabs,
  activeKey,
  ariaLabel,
  onSelect,
  className,
  idPrefix,
}: {
  tabs: Array<AppTabItem<T>>;
  activeKey: T;
  ariaLabel: string;
  onSelect: (key: T) => void;
  className?: string;
  idPrefix?: string;
}) {
  return (
    <AppSlidingTabs className={className}
      tabs={tabs}
      activeKey={activeKey}
      ariaLabel={ariaLabel}
      onSelect={onSelect}
      idPrefix={idPrefix}
    />
  );
}

export function AppTabbedPannel<T extends string>({
  tabs,
  activeKey,
  onSelect,
  indicator,
  panelWrapper,
  renderPane,
  className,
  idPrefix,
}: {
  tabs: Array<AppTabItem<T>>;
  activeKey: T;
  onSelect: (key: T) => void;
  indicator?: ReactNode;
  panelWrapper?: (children: ReactNode) => ReactNode;
  renderPane: (tab: AppTabItem<T>, active: boolean) => ReactNode;
  className?: string;
  idPrefix?: string;
}) {
  const panels = (
    <AppSwipeTabs
      tabs={tabs}
      activeKey={activeKey}
      onSelect={onSelect}
      renderPane={renderPane}
      className={className}
      idPrefix={idPrefix}
    />
  );

  return (
    <>
      {indicator}
      {panelWrapper ? panelWrapper(panels) : panels}
    </>
  );
}

const SWIPE_AXIS_LOCK_DISTANCE = 12;
const SWIPE_HORIZONTAL_INTENT_RATIO = 1.2;

export function AppSwipeTabs<T extends string>({
  tabs,
  activeKey,
  onSelect,
  renderPane,
  disabled,
  className,
  paneClassName,
  idPrefix,
}: {
  tabs: Array<AppTabItem<T>>;
  activeKey: T;
  onSelect: (key: T) => void;
  renderPane: (tab: AppTabItem<T>, active: boolean) => ReactNode;
  disabled?: boolean;
  className?: string;
  paneClassName?: string;
  idPrefix?: string;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const pointerStartYRef = useRef<number | null>(null);
  const pointerMoveXRef = useRef<number | null>(null);
  const pointerMoveYRef = useRef<number | null>(null);
  const pointerAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const ignoreSwipeRef = useRef(false);
  const suppressClickRef = useRef(false);
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeKey));

  function switchAdjacentTab(direction: "next" | "previous") {
    const nextIndex = direction === "next" ? activeIndex + 1 : activeIndex - 1;
    const nextTab = tabs[nextIndex];
    if (nextTab) {
      onSelect(nextTab.key);
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || event.pointerType !== "touch" || !event.isPrimary) return;
    suppressClickRef.current = false;
    ignoreSwipeRef.current = Boolean(
      event.target instanceof Element && event.target.closest("[data-mobile-tabs]")
    );
    pointerIdRef.current = event.pointerId;
    pointerAxisRef.current = null;
    pointerStartXRef.current = event.clientX;
    pointerStartYRef.current = event.clientY;
    pointerMoveXRef.current = event.clientX;
    pointerMoveYRef.current = event.clientY;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || ignoreSwipeRef.current || event.pointerId !== pointerIdRef.current) return;
    pointerMoveXRef.current = event.clientX;
    pointerMoveYRef.current = event.clientY;
    const horizontalDistance = Math.abs((pointerMoveXRef.current ?? 0) - (pointerStartXRef.current ?? 0));
    const verticalDistance = Math.abs((pointerMoveYRef.current ?? 0) - (pointerStartYRef.current ?? pointerMoveYRef.current ?? 0));

    if (!pointerAxisRef.current && Math.max(horizontalDistance, verticalDistance) >= SWIPE_AXIS_LOCK_DISTANCE) {
      // Decide once and never reclassify the gesture. Ambiguous diagonal motion
      // belongs to vertical scrolling so native scroll and tab dragging cannot
      // take control of the same gesture at different times.
      pointerAxisRef.current =
        horizontalDistance > verticalDistance * SWIPE_HORIZONTAL_INTENT_RATIO
          ? "horizontal"
          : "vertical";

      if (pointerAxisRef.current === "horizontal") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (pointerAxisRef.current !== "horizontal") return;
    event.stopPropagation();
    if (event.cancelable) {
      event.preventDefault();
    }
  }

  function resetPointerGesture() {
    pointerIdRef.current = null;
    pointerStartXRef.current = null;
    pointerStartYRef.current = null;
    pointerMoveXRef.current = null;
    pointerMoveYRef.current = null;
    pointerAxisRef.current = null;
    ignoreSwipeRef.current = false;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId !== pointerIdRef.current) return;
    const isHorizontalSwipe = pointerAxisRef.current === "horizontal" && !ignoreSwipeRef.current;
    const startX = pointerStartXRef.current;
    const endX = pointerMoveXRef.current;
    if (isHorizontalSwipe) {
      event.stopPropagation();
      suppressClickRef.current = true;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPointerGesture();

    if (isHorizontalSwipe && startX !== null && endX !== null) {
      const deltaX = endX - startX;
      const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
      const swipeThreshold = Math.min(120, Math.max(56, viewportWidth * 0.22));
      if (Math.abs(deltaX) > swipeThreshold) {
        switchAdjacentTab(deltaX < 0 ? "next" : "previous");
      }
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId !== pointerIdRef.current) return;
    if (pointerAxisRef.current === "horizontal") {
      event.stopPropagation();
    }
    resetPointerGesture();
  }

  function onClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      ref={viewportRef}
      data-slot="app-swipe-tabs"
      className={cn("relative overflow-hidden [touch-action:pan-y]", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            role="tabpanel"
            id={idPrefix ? `${idPrefix}-panel-${tab.key}` : undefined}
            aria-labelledby={idPrefix ? `${idPrefix}-tab-${tab.key}` : undefined}
            hidden={!active}
            aria-hidden={!active}
            className={cn("w-full", paneClassName)}
          >
            {renderPane(tab, active)}
          </div>
        );
      })}
    </div>
  );
}
