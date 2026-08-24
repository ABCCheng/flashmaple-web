"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type SetStateAction } from "react";

import type { DataRequestResult, PageInfo } from "@/lib/api/types";

export type PagedResourceEntry<T> = {
  items: T[];
  page: number;
  totalPages: number;
  failed: boolean;
};

export type PagedResourceCache<T> = {
  entries: Map<string, PagedResourceEntry<T>>;
  requests: Map<string, Promise<DataRequestResult<PageInfo<T>>>>;
};

type PagedResourceState<T> = PagedResourceEntry<T> & {
  key: string;
  loading: boolean;
};

type UsePagedResourceOptions<T> = {
  cache: PagedResourceCache<T>;
  cacheKey: string;
  enabled?: boolean;
  fetchPage: (page: number) => Promise<DataRequestResult<PageInfo<T>>>;
  mergeItems?: (current: T[], incoming: T[]) => T[];
};

type UsePagedResourceResult<T> = PagedResourceEntry<T> & {
  loading: boolean;
  load: (page?: number, force?: boolean) => Promise<void>;
  setItems: (items: SetStateAction<T[]>) => void;
};

const emptyEntry = <T,>(): PagedResourceEntry<T> => ({
  items: [],
  page: 1,
  totalPages: 1,
  failed: false,
});

export function createPagedResourceCache<T>(): PagedResourceCache<T> {
  return {
    entries: new Map(),
    requests: new Map(),
  };
}

export function getPagedResourceEntry<T>(cache: PagedResourceCache<T>, key: string) {
  return cache.entries.get(key);
}

export function usePagedResource<T>({
  cache,
  cacheKey,
  enabled = true,
  fetchPage,
  mergeItems = (current, incoming) => [...current, ...incoming],
}: UsePagedResourceOptions<T>): UsePagedResourceResult<T> {
  const initialEntry = cache.entries.get(cacheKey);
  const [state, setState] = useState<PagedResourceState<T>>(() => ({
    key: cacheKey,
    ...(initialEntry ?? emptyEntry<T>()),
    loading: enabled && !initialEntry,
  }));
  const activeKeyRef = useRef(cacheKey);

  if (state.key !== cacheKey) {
    const entry = cache.entries.get(cacheKey);
    setState({
      key: cacheKey,
      ...(entry ?? emptyEntry<T>()),
      loading: enabled && !entry,
    });
  }

  useLayoutEffect(() => {
    activeKeyRef.current = cacheKey;
  }, [cacheKey]);

  const load = useCallback(async (nextPage = 1, force = false) => {
    if (!enabled) return;

    const key = cacheKey;
    const cached = cache.entries.get(key);
    if (!force && nextPage === 1 && cached) {
      if (activeKeyRef.current === key) {
        setState({ key, ...cached, loading: false });
      }
      return;
    }

    if (activeKeyRef.current === key) {
      setState((current) => ({
        ...current,
        failed: false,
        loading: true,
      }));
    }

    const requestKey = `${key}:page:${nextPage}`;
    let request = cache.requests.get(requestKey);
    if (!request) {
      request = fetchPage(nextPage);
      cache.requests.set(requestKey, request);
    }

    const result = await request.finally(() => {
      if (cache.requests.get(requestKey) === request) {
        cache.requests.delete(requestKey);
      }
    });

    if (result.status === "success") {
      const pageInfo = result.data;
      const incomingItems = pageInfo?.list ?? [];
      const latestCached = cache.entries.get(key);
      const items = nextPage === 1
        ? incomingItems
        : mergeItems(latestCached?.items ?? cached?.items ?? [], incomingItems);
      const entry: PagedResourceEntry<T> = {
        items,
        page: pageInfo?.pageNum ?? nextPage,
        totalPages: pageInfo?.totalPages ?? 1,
        failed: false,
      };

      cache.entries.set(key, entry);
      if (activeKeyRef.current === key) {
        setState({ key, ...entry, loading: false });
      }
      return;
    }

    const latestCached = cache.entries.get(key);
    const entry: PagedResourceEntry<T> = {
      items: latestCached?.items ?? cached?.items ?? [],
      page: latestCached?.page ?? cached?.page ?? 1,
      totalPages: latestCached?.totalPages ?? cached?.totalPages ?? 1,
      failed: true,
    };

    cache.entries.set(key, entry);
    if (activeKeyRef.current === key) {
      setState({ key, ...entry, loading: false });
    }
  }, [cache, cacheKey, enabled, fetchPage, mergeItems]);

  useEffect(() => {
    if (!enabled || cache.entries.has(cacheKey)) return;
    void load(1);
  }, [cache, cacheKey, enabled, load]);

  const setItems = useCallback((nextItems: SetStateAction<T[]>) => {
    setState((current) => {
      const items = typeof nextItems === "function"
        ? nextItems(current.items)
        : nextItems;
      const entry: PagedResourceEntry<T> = {
        items,
        page: current.page,
        totalPages: current.totalPages,
        failed: current.failed,
      };
      cache.entries.set(cacheKey, entry);
      return { key: cacheKey, ...entry, loading: current.loading };
    });
  }, [cache, cacheKey]);

  return {
    items: state.items,
    page: state.page,
    totalPages: state.totalPages,
    failed: state.failed,
    loading: state.loading,
    load,
    setItems,
  };
}
