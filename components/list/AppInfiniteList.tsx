"use client";

import type { Key, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LoadMoreSentinel } from "@/components/list/LoadMoreSentinel";
import { getAppScrollRoot } from "@/lib/app-scroll";
import { cn } from "@/lib/class-names";

const estimatedItemHeight = 260;
const itemGap = 12;
const initialRenderCount = 16;
const overscanItems = 6;

type VisibleWindow = {
  start: number;
  end: number;
};

function buildVirtualLayout<T>(
  items: T[],
  getKey: (item: T, index: number) => Key,
  measuredHeights: Map<Key, number>
) {
  const offsets: number[] = [];
  let totalHeight = 0;

  for (let index = 0; index < items.length; index += 1) {
    offsets.push(totalHeight);
    totalHeight += measuredHeights.get(getKey(items[index], index)) ?? estimatedItemHeight;
    if (index < items.length - 1) {
      totalHeight += itemGap;
    }
  }

  return { offsets, totalHeight };
}

function VirtualListItem({
  itemKey,
  offset,
  onMeasure,
  children,
}: {
  itemKey: Key;
  offset: number;
  onMeasure: (key: Key, height: number) => void;
  children: ReactNode;
}) {
  const itemRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = itemRef.current;
    if (!node) return;

    const updateHeight = () => {
      onMeasure(itemKey, node.getBoundingClientRect().height);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [itemKey, onMeasure]);

  return (
    <div
      ref={itemRef}
      data-slot="app-infinite-list-item"
      className="absolute inset-x-0 top-0"
      style={{ transform: `translateY(${offset}px)` }}
    >
      {children}
    </div>
  );
}

function findVisibleStart(offsets: number[], viewportStart: number) {
  let low = 0;
  let high = offsets.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] < viewportStart) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return Math.max(0, low - 1);
}

function findVisibleEnd(offsets: number[], viewportEnd: number) {
  let low = 0;
  let high = offsets.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= viewportEnd) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

export function AppInfiniteList<T>({
  items,
  getKey,
  renderItem,
  loading,
  hasMore,
  onLoadMore,
  enabled = true,
  className,
}: {
  items: T[];
  getKey: (item: T, index: number) => Key;
  renderItem: (item: T, index: number) => ReactNode;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void | Promise<void>;
  enabled?: boolean;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [measuredHeights, setMeasuredHeights] = useState(() => new Map<Key, number>());
  const [visibleWindow, setVisibleWindow] = useState<VisibleWindow>(() => ({
    start: 0,
    end: Math.min(items.length, initialRenderCount),
  }));

  const layout = useMemo(
    () => buildVirtualLayout(items, getKey, measuredHeights),
    [getKey, items, measuredHeights]
  );

  const readVisibleWindow = useCallback((): VisibleWindow => {
    const list = listRef.current;
    if (!list || !items.length) {
      return { start: 0, end: 0 };
    }

    const root = getAppScrollRoot();
    const listRect = list.getBoundingClientRect();
    const rootRect =
      root && root !== document.scrollingElement
        ? root.getBoundingClientRect()
        : { top: 0, bottom: window.innerHeight };
    const viewportStart = Math.max(0, rootRect.top - listRect.top);
    const viewportEnd = Math.min(layout.totalHeight, rootRect.bottom - listRect.top);
    const start = Math.max(0, findVisibleStart(layout.offsets, viewportStart) - overscanItems);
    const end = Math.min(items.length, findVisibleEnd(layout.offsets, viewportEnd) + overscanItems);

    return { start, end };
  }, [items.length, layout.offsets, layout.totalHeight]);

  const updateVisibleWindow = useCallback(() => {
    const { start, end } = readVisibleWindow();
    setVisibleWindow((previous) =>
      previous.start === start && previous.end === end ? previous : { start, end }
    );
  }, [readVisibleWindow]);

  useEffect(() => {
    if (!enabled) return;

    const root = getAppScrollRoot();
    const scrollTarget: HTMLElement | Window = root && root !== document.scrollingElement ? root : window;
    let frame = 0;
    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateVisibleWindow);
    };

    scheduleUpdate();
    scrollTarget.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener("resize", scheduleUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollTarget.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener("resize", scheduleUpdate);
    };
  }, [enabled, updateVisibleWindow]);

  const measureItem = useCallback((key: Key, nextHeight: number) => {
    if (nextHeight <= 0) return;

    setMeasuredHeights((previous) => {
      const previousHeight = previous.get(key);
      if (Math.abs((previousHeight ?? 0) - nextHeight) <= 1) {
        return previous;
      }

      const next = new Map(previous);
      next.set(key, nextHeight);
      return next;
    });
  }, []);

  const visibleItems = items.slice(visibleWindow.start, visibleWindow.end);

  return (
    <>
      <div
        ref={listRef}
        data-slot="app-infinite-list"
        className={cn("relative w-full", className)}
        style={{ height: layout.totalHeight }}
      >
        {visibleItems.map((item, visibleIndex) => {
          const index = visibleWindow.start + visibleIndex;
          const key = getKey(item, index);
          return (
            <VirtualListItem
              key={key}
              itemKey={key}
              offset={layout.offsets[index] ?? 0}
              onMeasure={measureItem}
            >
              {renderItem(item, index)}
            </VirtualListItem>
          );
        })}
      </div>
      <LoadMoreSentinel
        enabled={enabled && Boolean(items.length)}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
      />
    </>
  );
}
