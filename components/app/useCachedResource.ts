"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import type { DataRequestResult } from "@/lib/api/types";

export type CachedResourceEntry<T> = {
  data: T | null;
  failed: boolean;
};

export type CachedResourceCache<T> = {
  entries: Map<string, CachedResourceEntry<T>>;
  requests: Map<string, Promise<DataRequestResult<T>>>;
};

type CachedResourceState<T> = CachedResourceEntry<T> & {
  key: string;
  loading: boolean;
};

type UseCachedResourceOptions<T> = {
  cache: CachedResourceCache<T>;
  cacheKey: string;
  enabled?: boolean;
  fetch: () => Promise<DataRequestResult<T>>;
};

type UseCachedResourceResult<T> = CachedResourceEntry<T> & {
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
};

export function createCachedResourceCache<T>(): CachedResourceCache<T> {
  return {
    entries: new Map(),
    requests: new Map(),
  };
}

export function useCachedResource<T>({
  cache,
  cacheKey,
  enabled = true,
  fetch,
}: UseCachedResourceOptions<T>): UseCachedResourceResult<T> {
  const initialEntry = cache.entries.get(cacheKey);
  const [state, setState] = useState<CachedResourceState<T>>(() => ({
    key: cacheKey,
    data: initialEntry?.data ?? null,
    failed: initialEntry?.failed ?? false,
    loading: enabled && !initialEntry,
  }));
  const activeKeyRef = useRef(cacheKey);

  if (state.key !== cacheKey) {
    const entry = cache.entries.get(cacheKey);
    setState({
      key: cacheKey,
      data: entry?.data ?? null,
      failed: entry?.failed ?? false,
      loading: enabled && !entry,
    });
  }

  useLayoutEffect(() => {
    activeKeyRef.current = cacheKey;
  }, [cacheKey]);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;

    const key = cacheKey;
    const cached = cache.entries.get(key);
    if (!force && cached) {
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

    let request = cache.requests.get(key);
    if (!request) {
      request = fetch();
      cache.requests.set(key, request);
    }

    const result = await request.finally(() => {
      if (cache.requests.get(key) === request) {
        cache.requests.delete(key);
      }
    });

    if (result.status === "success") {
      const entry: CachedResourceEntry<T> = {
        data: result.data,
        failed: false,
      };
      cache.entries.set(key, entry);
      if (activeKeyRef.current === key) {
        setState({ key, ...entry, loading: false });
      }
      return;
    }

    const entry: CachedResourceEntry<T> = {
      data: cache.entries.get(key)?.data ?? cached?.data ?? null,
      failed: true,
    };
    cache.entries.set(key, entry);
    if (activeKeyRef.current === key) {
      setState({ key, ...entry, loading: false });
    }
  }, [cache, cacheKey, enabled, fetch]);

  useEffect(() => {
    if (!enabled) return;

    const cached = cache.entries.get(cacheKey);
    if (cached) return;

    void load();
  }, [cache, cacheKey, enabled, load]);

  return {
    data: state.data,
    failed: state.failed,
    loading: state.loading,
    load,
  };
}
