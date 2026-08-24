"use client";

import { Loader } from "lucide-react";
import { useEffect, useRef } from "react";

import { useLocaleContext } from "@/components/providers/locale-provider";

export function LoadMoreSentinel({
  enabled,
  loading,
  hasMore,
  onLoadMore,
}: {
  enabled: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void | Promise<void>;
}) {
  const { dictionary } = useLocaleContext();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const inFlightRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!loading) {
      inFlightRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled || loading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !inFlightRef.current) {
          inFlightRef.current = true;
          void Promise.resolve(onLoadMoreRef.current()).finally(() => {
            inFlightRef.current = false;
          });
        }
      },
      {
        root: window.matchMedia("(min-width: 768px)").matches
          ? document.querySelector(".app-content")
          : null,
        rootMargin: "160px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, loading]);

  if (!enabled) return null;

  return (
    <div ref={sentinelRef} className="mb-(--app-safe-tab-bottom) flex min-h-12 w-full items-center justify-center py-2 text-sm leading-5 text-muted-foreground md:mb-0">
      {loading ? (
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          <Loader className="size-4 animate-spin text-primary" />
          {dictionary.feed.loadingMore}
        </span>
      ) : hasMore ? (
        <span className="whitespace-nowrap">{dictionary.feed.loadMoreIdle}</span>
      ) : (
        <span className="whitespace-nowrap">{dictionary.feed.noMore}</span>
      )}
    </div>
  );
}
