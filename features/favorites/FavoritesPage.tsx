"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NewsFavoriteCard } from "@/features/news/NewsCard";
import { AppInfiniteList, PullToRefreshIndicator, PullToRefreshSurface, usePullToRefresh } from "@/components/list";
import { AppCenteredState, AppLoadingOverlay, AppMobileStickyHeader, AppMobileStickyHeaderSpacer, AppSearchField, createPagedResourceCache, usePagedResource } from "@/components/app";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { usePageRefreshContext, usePageRefreshHandler } from "@/components/providers/page-refresh-provider";
import { Button } from "@/components/ui/button";
import {
  fetchFavoriteList,
  fetchFavoriteSearch,
  unFavorite,
  type NewsItemFavoriteInfo,
} from "@/lib/api/news";
import { scrollAppToTop } from "@/lib/app-scroll";
import { localizePath, stripLocaleFromPathname } from "@/lib/i18n";
import { subscribeAuthStateChanged } from "@/lib/stores/auth-user";
import { getAuthIdentity, getUserInfo, isAuthenticated } from "@/lib/stores/auth-user";
import { formatMonthDayTime } from "@/lib/time";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const SEARCH_DEBOUNCE_MS = 500;
const refreshRevealClassName =
  "isolate [backface-visibility:hidden] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none";

const favoritesCache = createPagedResourceCache<NewsItemFavoriteInfo>();

function getFavoritesAuthIdentity() {
  if (!isAuthenticated()) return "";
  return getAuthIdentity()?.userId?.trim() || getUserInfo()?.userId?.trim() || "authenticated";
}

function getFavoritesCacheKey(locale: string, keyword: string, authIdentity: string) {
  return keyword
    ? `favorites:${authIdentity}:search:${locale}:${keyword}`
    : `favorites:${authIdentity}:list:${locale}`;
}

function mergeFavoriteItems(
  current: NewsItemFavoriteInfo[],
  incoming: NewsItemFavoriteInfo[]
) {
  const items = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => items.set(item.id, item));
  return [...items.values()];
}

export function FavoritesPage() {
  const { dictionary, locale } = useLocaleContext();
  const { refreshing: desktopRefreshing } = usePageRefreshContext();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFavoritesRouteActive = stripLocaleFromPathname(pathname) === "/favorites";
  const searchParamsString = searchParams.toString();
  const authIdentity = useSyncExternalStore(
    subscribeAuthStateChanged,
    getFavoritesAuthIdentity,
    () => ""
  );
  const isLoggedIn = Boolean(authIdentity);
  const incomingQuery = searchParams.get("q") ?? "";
  const incomingKeyword = incomingQuery.trim();
  const incomingNavigationKey = `${locale}\n${authIdentity}\n${searchParamsString}`;
  const initialQuery = incomingQuery;
  const initialKeyword = initialQuery.trim();
  const [syncedNavigationKey, setSyncedNavigationKey] = useState(incomingNavigationKey);
  const [query, setQuery] = useState(initialQuery);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [favoriting, setFavoriting] = useState(false);
  const trimmedQuery = query.trim();
  const keyword = trimmedQuery
    ? query === incomingQuery
      ? trimmedQuery
      : debouncedQuery.trim()
    : "";
  const cacheKey = getFavoritesCacheKey(locale, keyword, authIdentity);
  const urlSearchKeywordRef = useRef(initialKeyword);
  const initialLoadSettledRef = useRef(false);

  const fetchPage = useCallback(
    (page: number) => keyword
      ? fetchFavoriteSearch(keyword, page)
      : fetchFavoriteList(page),
    [keyword]
  );
  const {
    items,
    page,
    totalPages,
    loading,
    failed,
    load,
    setItems,
  } = usePagedResource({
    cache: favoritesCache,
    cacheKey,
    enabled: isLoggedIn,
    fetchPage,
    mergeItems: mergeFavoriteItems,
  });

  if (isFavoritesRouteActive && syncedNavigationKey !== incomingNavigationKey) {
    setSyncedNavigationKey(incomingNavigationKey);
    setQuery(incomingQuery);
  }

  useLayoutEffect(() => {
    if (!isFavoritesRouteActive) return;
    urlSearchKeywordRef.current = incomingKeyword;
  }, [incomingKeyword, isFavoritesRouteActive]);

  useEffect(() => {
    if (!isFavoritesRouteActive) return;
    if (urlSearchKeywordRef.current === keyword) return;

    const currentSearchParams = new URLSearchParams(window.location.search);
    if (keyword) {
      currentSearchParams.set("q", keyword);
    } else {
      currentSearchParams.delete("q");
    }

    const nextQuery = currentSearchParams.toString();
    urlSearchKeywordRef.current = keyword;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`
    );
  }, [isFavoritesRouteActive, keyword, searchParamsString]);

  const refreshCurrentPage = useCallback(async () => {
    await load(1, true);
    setRefreshRevision((current) => current + 1);
  }, [load]);

  usePageRefreshHandler(refreshCurrentPage, isFavoritesRouteActive);

  async function handleRemove(newsItemId: number) {
    try {
      setFavoriting(true);
      const response = await unFavorite(newsItemId);
      if (response?.code !== 200) return;
      setItems((previous) => previous.filter((item) => item.newsItemId !== newsItemId));
    } finally {
      setFavoriting(false);
    }
  }

  const pullToRefresh = usePullToRefresh({
    disabled: loading || !isLoggedIn,
    onRefresh: refreshCurrentPage,
  });
  const { resetPull: resetPullToRefresh } = pullToRefresh;

  useLayoutEffect(() => {
    if (initialLoadSettledRef.current || loading) return;

    initialLoadSettledRef.current = true;
    resetPullToRefresh();
    void scrollAppToTop("auto");
  }, [loading, resetPullToRefresh]);

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <MobileHeader disabled={true} query={query} setQuery={setQuery} placeholder={dictionary.favorites.searchPlaceholder} />
        <AppCenteredState
          title={dictionary.favorites.loginRequiredTitle}
          description={dictionary.favorites.loginRequiredDescription}
          actionLabel={dictionary.favorites.loginAction}
          onAction={() => router.push(localizePath("/auth", locale))}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(var(--app-viewport-height)-var(--app-safe-tab-bottom))] px-4 md:min-h-0"
      {...pullToRefresh.touchHandlers}
    >
      {favoriting ? (
        <AppLoadingOverlay />
      ) : null}
      {desktopRefreshing && items.length ? (
        <AppLoadingOverlay className="hidden md:flex" />
      ) : null}

      <MobileHeader
        disabled={false}
        query={query}
        setQuery={setQuery}
        placeholder={dictionary.favorites.searchPlaceholder}
      />
      {pullToRefresh.shouldShowPullIndicator ? (
        <PullToRefreshIndicator state={pullToRefresh} />
      ) : null}

      {loading && !items.length ? (
        <AppLoadingOverlay />
      ) :
      failed && !items.length ? (
        <AppCenteredState
          title={dictionary.favorites.loadFailedTitle}
          description={dictionary.favorites.loadFailedDescription}
          actionLabel={dictionary.favorites.loadFailedRetry}
          onAction={() => load(1, true)}
        />
      ) :
      items.length ? (
        <PullToRefreshSurface
          className="pt-4"
        >
          <div className="space-y-3">
            <AppInfiniteList
              key={refreshRevision}
              items={items}
              getKey={(item) => item.id}
              loading={loading && page < totalPages}
              hasMore={!failed && page < totalPages}
              onLoadMore={() => load(page + 1)}
              renderItem={(item, index) => (
                <div
                  className={`relative ${refreshRevealClassName}`}
                  style={{
                    animationDelay: `${Math.min(index, 5) * 45}ms`,
                    animationFillMode: "both",
                  }}
                >
                <NewsFavoriteCard
                  item={item}
                  pubTime={formatMonthDayTime(item.isoPubDate)}
                  favoriteTime={formatMonthDayTime(item.isoFavoriteDate)}
                  detailHref={localizePath(
                    `/news/detail?id=${encodeURIComponent(String(item.newsItemId))}`,
                    locale
                  )}
                  highlightKeyword={keyword}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute bottom-2 right-2 size-4 cursor-pointer md:right-75 md:size-8"
                  aria-label={dictionary.favorites.remove}
                  onClick={() => handleRemove(item.newsItemId)}
                >
                  <Trash2 />
                </Button>
              </div>
              )}
            />
            {failed ? (
              <div className="flex justify-center py-3">
                <Button type="button" variant="outline" onClick={() => load(1, true)}>
                  {dictionary.favorites.loadFailedRetry}
                </Button>
              </div>
            ) : null}
          </div>
        </PullToRefreshSurface>
      ) :
      (
        <AppCenteredState muted>
          {keyword ? dictionary.favorites.noSearchResult : dictionary.favorites.empty}
        </AppCenteredState>
      )}

    </div>
  );
}


function MobileHeader({
  disabled,
  query,
  setQuery,
  placeholder,
}: {
  disabled: boolean;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  placeholder: string;
}) {
  return (
    <div className="space-y-4 md:hidden">
      <AppMobileStickyHeader>
        <AppSearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          placeholder={placeholder}
          disabled={disabled}
        />
      </AppMobileStickyHeader>
      <AppMobileStickyHeaderSpacer height="calc(var(--app-safe-header-top) + 2.125rem)" />
    </div>
  );
}
