"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { NewsCard } from "@/features/news/NewsCard";
import { AppBackToTopButton } from "@/components/shell/AppBackToTopButton";
import { AppInfiniteList, PullToRefreshIndicator, PullToRefreshSurface, usePullToRefresh } from "@/components/list";
import { AppCenteredState, AppLoadingOverlay, AppMobileStickyHeader, AppMobileStickyHeaderSpacer, AppPage, AppSearchField, AppTabbedHeader, AppTabbedPannel, createPagedResourceCache, getPagedResourceEntry, usePagedResource } from "@/components/app";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { usePageRefreshContext, usePageRefreshHandler } from "@/components/providers/page-refresh-provider";
import { useRegionContext } from "@/components/providers/region-provider";
import {
  getAppScrollRoot,
  notifyAppScrollSnapshot,
  rememberAppScrollPosition,
  restoreAppScrollPosition,
  subscribeAppScrollSnapshot,
} from "@/lib/app-scroll";
import { fetchNewsList, fetchNewsSearch, type NewsItemInfo } from "@/lib/api/news";
import { subscribeExploreTabSelection } from "@/lib/explore-tab-events";
import { localizePath, stripLocaleFromPathname } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/time";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const tabKeys = ["local", "immigration", "education", "health", "entertainment", "headline"] as const;
type ExploreTabKey = (typeof tabKeys)[number];
const defaultExploreTab: ExploreTabKey = "local";
const SEARCH_DEBOUNCE_MS = 500;
const refreshRevealClassName =
  "isolate [backface-visibility:hidden] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-reduce:animate-none";

type ExplorePane = {
  items: NewsItemInfo[];
  failed: boolean;
  loading: boolean;
};

const exploreCache = createPagedResourceCache<NewsItemInfo>();

function getExploreTab(value: string | null): ExploreTabKey {
  return tabKeys.includes(value as ExploreTabKey) ? (value as ExploreTabKey) : defaultExploreTab;
}

function resolveExploreTab(value: string | null) {
  return getExploreTab(value);
}

function getExploreCacheKey(locale: string, region: string, tab: ExploreTabKey, searchKeyword: string) {
  return searchKeyword ? `explore:search:${locale}:${region}:${searchKeyword}` : `explore:tab:${locale}:${region}:${tab}`;
}

function useExploreScrollPosition(key: string, enabled: boolean) {
  const activeKeyRef = useRef(key);
  const enabledRef = useRef(enabled);

  useLayoutEffect(() => {
    activeKeyRef.current = key;
    enabledRef.current = enabled;
    if (enabled) {
      restoreAppScrollPosition(key);
    }
  }, [enabled, key]);

  useEffect(() => {
    const root = getAppScrollRoot();
    const rememberCurrentPosition = (event: Event) => {
      if (!enabledRef.current) return;
      rememberAppScrollPosition(activeKeyRef.current);

      if (event instanceof CustomEvent && event.detail?.deactivate) {
        enabledRef.current = false;
      }
    };

    if (!enabled) return;

    root?.addEventListener("scroll", rememberCurrentPosition, { passive: true });
    window.addEventListener("scroll", rememberCurrentPosition, { passive: true });
    const unsubscribeSnapshot = subscribeAppScrollSnapshot(rememberCurrentPosition);

    return () => {
      root?.removeEventListener("scroll", rememberCurrentPosition);
      window.removeEventListener("scroll", rememberCurrentPosition);
      unsubscribeSnapshot();
    };
  }, [enabled]);
}

function mergeExploreItems(current: NewsItemInfo[], incoming: NewsItemInfo[]) {
  const items = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => items.set(item.id, item));
  return [...items.values()];
}

export function ExplorePage() {
  const { dictionary, locale } = useLocaleContext();
  const { region } = useRegionContext();
  const { refreshing: desktopRefreshing } = usePageRefreshContext();
  const tabsId = useId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isExploreRouteActive = stripLocaleFromPathname(pathname) === "/news";
  const searchParamsString = searchParams.toString();
  const incomingTab = resolveExploreTab(searchParams.get("tab"));
  const incomingQuery = searchParams.get("q") ?? "";
  const incomingKeyword = incomingQuery.trim();
  const incomingNavigationKey = `${locale}\n${region}\n${searchParamsString}`;
  const initialTab = incomingTab;
  const initialQuery = incomingQuery;
  const initialKeyword = initialQuery.trim();
  const [syncedNavigationKey, setSyncedNavigationKey] = useState(incomingNavigationKey);
  const [activeTab, setActiveTab] = useState<ExploreTabKey>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = query.trim();
  const searchKeyword = trimmedQuery
    ? query === incomingQuery
      ? trimmedQuery
      : debouncedQuery.trim()
    : "";
  const cacheKey = getExploreCacheKey(locale, region, activeTab, searchKeyword);
  const urlSearchKeywordRef = useRef(initialKeyword);

  const fetchPage = useCallback(
    (page: number) => searchKeyword
      ? fetchNewsSearch(searchKeyword, page)
      : fetchNewsList(region, activeTab, page),
    [activeTab, region, searchKeyword]
  );
  const {
    items,
    page,
    totalPages,
    loading,
    failed,
    load,
  } = usePagedResource({
    cache: exploreCache,
    cacheKey,
    fetchPage,
    mergeItems: mergeExploreItems,
  });
  useExploreScrollPosition(cacheKey, isExploreRouteActive);

  const tabs = useMemo(
    () => tabKeys.map((key) => ({ key, label: dictionary.explore.tabs[key] })),
    [dictionary]
  );

  if (isExploreRouteActive && syncedNavigationKey !== incomingNavigationKey) {
    setSyncedNavigationKey(incomingNavigationKey);
    setQuery(incomingQuery);
    setActiveTab(incomingTab);
  }

  const switchTab = useCallback((tab: ExploreTabKey, nextKeyword = "") => {
    const normalizedKeyword = nextKeyword.trim();
    if (
      tab === activeTab &&
      normalizedKeyword === searchKeyword &&
      query === normalizedKeyword
    ) {
      return false;
    }

    notifyAppScrollSnapshot();
    rememberAppScrollPosition(cacheKey);
    urlSearchKeywordRef.current = normalizedKeyword;
    setQuery(normalizedKeyword);
    setActiveTab(tab);
    return true;
  }, [activeTab, cacheKey, query, searchKeyword]);

  useLayoutEffect(() => {
    if (!isExploreRouteActive) return;
    urlSearchKeywordRef.current = incomingKeyword;
  }, [incomingKeyword, isExploreRouteActive]);

  useEffect(() => {
    if (!isExploreRouteActive) return;
    if (urlSearchKeywordRef.current === searchKeyword) return;

    const currentSearchParams = new URLSearchParams(window.location.search);

    if (searchKeyword) {
      currentSearchParams.set("q", searchKeyword);
    } else {
      currentSearchParams.delete("q");
    }

    const nextQuery = currentSearchParams.toString();
    urlSearchKeywordRef.current = searchKeyword;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`
    );
  }, [isExploreRouteActive, searchKeyword, searchParamsString]);

  const refreshCurrentPage = useCallback(async () => {
    rememberAppScrollPosition(cacheKey, 0);
    await load(1, true);
    setRefreshRevision((current) => current + 1);
  }, [cacheKey, load]);

  const handleDesktopTabSelection = useEffectEvent((tab: string) => {
    if (!tabKeys.includes(tab as ExploreTabKey)) return;
    switchTab(tab as ExploreTabKey, "");
  });

  useEffect(
    () => subscribeExploreTabSelection(handleDesktopTabSelection),
    []
  );

  usePageRefreshHandler(refreshCurrentPage, isExploreRouteActive);

  function handleTabSelect(tab: ExploreTabKey) {
    const stateChanged = switchTab(tab, "");
    const nextSearchParams = new URLSearchParams(window.location.search);
    const urlAlreadyMatches =
      nextSearchParams.get("tab") === tab && !nextSearchParams.has("q");
    if (!stateChanged && urlAlreadyMatches) return;

    nextSearchParams.set("tab", tab);
    nextSearchParams.delete("q");
    const nextQuery = nextSearchParams.toString();
    window.history.pushState(
      null,
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`
    );
  }

  function renderExplorePane(pane: ExplorePane, withSentinel: boolean) {
    return (
      <>
        {pane.items.length ? (
          <div className="space-y-3">
            <AppInfiniteList
              items={pane.items}
              getKey={(item) => item.id}
              loading={loading && page < totalPages}
              hasMore={!pane.failed && page < totalPages}
              onLoadMore={() => load(page + 1)}
              enabled={withSentinel}
              renderItem={(item) => (
                <NewsCard
                  item={item}
                  time={formatRelativeTime(item.isoPubDate, dictionary)}
                  detailHref={localizePath(
                    `/news/detail?id=${encodeURIComponent(String(item.id))}`,
                    locale
                  )}
                  highlightKeyword={searchKeyword}
                />
              )}
            />
          </div>
        ) : null}
      </>
    );
  }

  function renderExploreStatus(pane: ExplorePane) {
    if (pane.items.length) return null;

    if (pane.failed) {
      return (
        <AppCenteredState
          title={dictionary.explore.empty.title}
          description={dictionary.explore.empty.description}
          actionLabel={dictionary.explore.empty.retry}
          onAction={() => load(1, true)}
        />
      );
    }

    return (
      <>
        {pane.loading ? (
          <AppLoadingOverlay />
        ) : searchKeyword ? (
          <AppCenteredState muted>{dictionary.explore.search.noResult}</AppCenteredState>
        ) : (
          <AppCenteredState muted>{dictionary.explore.empty.noContentTitle}</AppCenteredState>
        )}
      </>
    );
  }

  function buildPaneForTab(tab: ExploreTabKey): ExplorePane {
    if (tab === activeTab) {
      return {
        items,
        failed,
        loading,
      };
    }

    const paneCacheKey = getExploreCacheKey(locale, region, tab, searchKeyword);
    const cached = getPagedResourceEntry(exploreCache, paneCacheKey);
    return {
      items: cached?.items ?? [],
      failed: cached?.failed ?? false,
      loading: !cached,
    };
  }

  const activePane = buildPaneForTab(activeTab);
  const pullToRefresh = usePullToRefresh({
    disabled: loading,
    onRefresh: refreshCurrentPage,
  });
  const searchHeader = (
    <div className="flex items-center gap-2">
      <AppSearchField
        className="min-w-0 flex-1"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onClear={() => setQuery("")}
        placeholder={dictionary.explore.search.placeholder}
      />
    </div>
  );
  const pullIndicator = pullToRefresh.shouldShowPullIndicator ? (
    <PullToRefreshIndicator state={pullToRefresh} />
  ) : null;

  return (
    <AppPage {...pullToRefresh.touchHandlers}>
      {desktopRefreshing && items.length ? (
        <AppLoadingOverlay className="hidden md:flex" />
      ) : null}
      <AppMobileStickyHeader className="space-y-2">
        {searchHeader}
        {!searchKeyword ? (<AppTabbedHeader
          tabs={tabs}
          activeKey={activeTab}
          ariaLabel={dictionary.tabs.explore}
          idPrefix={tabsId}
          onSelect={handleTabSelect}/>
        ) : null}
      </AppMobileStickyHeader>

      {renderExploreStatus(activePane)}

      {searchKeyword ? (
        <>
          <AppMobileStickyHeaderSpacer height="calc(var(--app-safe-header-top) + 2.25rem)" />
          {pullIndicator}
          <PullToRefreshSurface>
            <div
              key={refreshRevision}
              className={refreshRevealClassName}
              style={{ animationFillMode: "both" }}
            >
              {renderExplorePane(activePane, true)}
            </div>
          </PullToRefreshSurface>
        </>
      ) : (
        <>
        <AppMobileStickyHeaderSpacer height="calc(var(--app-safe-header-top) + 3.125rem)" />
        <AppTabbedPannel 
          className="pt-4 md:pt-0"
          tabs={tabs}
          activeKey={activeTab}
          idPrefix={tabsId}
          onSelect={handleTabSelect}
          indicator={pullIndicator}
          panelWrapper={(children) => (
            <PullToRefreshSurface>
              <div
                key={refreshRevision}
                className={refreshRevealClassName}
                style={{ animationFillMode: "both" }}
              >
                {children}
              </div>
            </PullToRefreshSurface>
          )}
          renderPane={(tab, active) => renderExplorePane(buildPaneForTab(tab.key), active)}
        />
        </>
      )}
      <AppBackToTopButton aria-label={dictionary.feed.backToTop} />
    </AppPage>
  );
}
