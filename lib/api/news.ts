import { get, post } from "./client";
import { reuseInFlightRequest } from "./request-cache";
import type { ApiResponse, DataRequestResult, PageInfo } from "./types";

export interface NewsItemInfo {
  id: number;
  source: string;
  sourceIconUrl: string;
  title: string;
  langTitle: string;
  description: string;
  langDescription: string;
  link: string;
  imageUrl: string;
  isoPubDate: string;
}

export interface NewsItemWithStatInfo extends NewsItemInfo {
  readCount: number;
  favoriteCount: number;
  favorited: boolean;
}

export interface FlashNewsItemInfo {
  id: number;
  source: string;
  topic: string;
  title: string;
  langTitle: string;
  description: string;
  langDescription: string;
  imageUrl: string;
}

export interface FlashBriefingPointInfo {
  title: string;
  detail: string;
  newsId: number | null;
}

export interface FlashBriefingInfo {
  summary: string | null;
  focusList: FlashBriefingPointInfo[];
  watchList: FlashBriefingPointInfo[];
  generatedAt: string | null;
}

export interface TransitAlertInfo {
  route: string;
  severityOrder: number | null;
  status: string;
  message: string;
  cause: string;
  direction: string;
  fromStop: string;
  toStop: string;
  shuttle: string;
}

export interface TransitStatusInfo {
  alerts: TransitAlertInfo[];
  updatedAt: string | null;
  externalLink: string | null;
}

export interface FlashInfo {
  topStoryMood: string;
  greeting: string;
  topStoryList: FlashNewsItemInfo[];
  briefing: FlashBriefingInfo | null;
  transitStatus: TransitStatusInfo | null;
}

export interface NewsItemFavoriteInfo {
  id: number;
  newsItemId: number;
  source: string;
  title: string;
  langTitle: string;
  imageUrl: string;
  isoPubDate: string;
  isoFavoriteDate: string;
}

function toResult<T>(res: ApiResponse<T> | null): DataRequestResult<T> {
  if (!res || res.code !== 200) {
    return { status: "error" };
  }
  return { status: "success", data: res.data ?? null };
}

export async function fetchNewsFlash(region: string, signal?: AbortSignal) {
  return toResult(
    await post<ApiResponse<FlashInfo>>(
      "/api/flash/news-item/list-flash",
      { region },
      signal ? { signal } : undefined
    )
  );
}

export async function fetchNewsList(region: string, topic: string, page: number) {
  return toResult(
    await post<ApiResponse<PageInfo<NewsItemInfo>>>("/api/flash/news-item/list-category", {
      region,
      topic,
      pageNum: page,
    })
  );
}

export async function fetchNewsSearch(keyword: string, page: number) {
  return toResult(
    await post<ApiResponse<PageInfo<NewsItemInfo>>>("/api/flash/news-item/search", {
      keyword,
      pageNum: page,
    })
  );
}

export async function fetchNewsDetail(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error" } as DataRequestResult<NewsItemWithStatInfo>;
  }

  return reuseInFlightRequest(
    `news-detail:${id}`,
    async () => toResult(
      await get<ApiResponse<NewsItemWithStatInfo>>(
        `/api/flash/news-item/detail-item?id=${encodeURIComponent(String(id))}`
      )
    )
  );
}

export async function fetchNextNewsDetail(currentId: number) {
  if (!Number.isInteger(currentId) || currentId <= 0) {
    return { status: "error" } as DataRequestResult<NewsItemWithStatInfo>;
  }

  return toResult(
    await get<ApiResponse<NewsItemWithStatInfo>>(
      `/api/flash/news-item/detail-next-item?currentId=${encodeURIComponent(String(currentId))}`
    )
  );
};

export async function fetchFavoriteList(page: number) {
  return toResult(
    await post<ApiResponse<PageInfo<NewsItemFavoriteInfo>>>("/api/flash/news-item-favorite/list", {
      pageNum: page,
    })
  );
}

export async function fetchFavoriteSearch(keyword: string, page: number) {
  return toResult(
    await post<ApiResponse<PageInfo<NewsItemFavoriteInfo>>>("/api/flash/news-item-favorite/search", {
      keyword,
      pageNum: page,
    })
  );
}

export async function favorite(newsItemId: number) {
  return post<ApiResponse<void>>("/api/flash/news-item-favorite/update", {
    newsItemId,
    favorite: true,
  });
}

export async function unFavorite(newsItemId: number) {
  return post<ApiResponse<void>>("/api/flash/news-item-favorite/update", {
    newsItemId,
    favorite: false,
  });
}
