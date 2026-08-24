"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { scrollAppToTop } from "@/lib/app-scroll";

type RefreshHandler = () => Promise<void> | void;
type RefreshOptions = {
  scrollToTop?: boolean;
};
type RefreshRegistration = RefreshOptions & {
  handler: RefreshHandler;
};

type PageRefreshContextValue = {
  canRefresh: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  registerRefreshHandler: (handler: RefreshHandler, options?: RefreshOptions) => () => void;
};

const PageRefreshContext = createContext<PageRefreshContextValue>({
  canRefresh: false,
  refreshing: false,
  refresh: async () => {},
  registerRefreshHandler: () => () => {},
});

export function PageRefreshProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<RefreshRegistration | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const registerRefreshHandler = useCallback((nextHandler: RefreshHandler, options?: RefreshOptions) => {
    setRegistration({
      handler: nextHandler,
      scrollToTop: options?.scrollToTop ?? true,
    });
    return () => {
      setRegistration((current) => (current?.handler === nextHandler ? null : current));
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!registration || refreshing) return;
    setRefreshing(true);
    try {
      if (registration.scrollToTop !== false) {
        await scrollAppToTop("smooth");
      }
      await registration.handler();
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, registration]);

  const value = useMemo(
    () => ({
      canRefresh: Boolean(registration),
      refreshing,
      refresh,
      registerRefreshHandler,
    }),
    [registration, refresh, refreshing, registerRefreshHandler]
  );

  return (
    <PageRefreshContext.Provider value={value}>
      {children}
    </PageRefreshContext.Provider>
  );
}

export function usePageRefreshContext() {
  return useContext(PageRefreshContext);
}

export function usePageRefreshHandler(
  handler: RefreshHandler,
  enabled = true,
  options?: RefreshOptions,
) {
  const { registerRefreshHandler } = usePageRefreshContext();
  const scrollToTop = options?.scrollToTop ?? true;

  useEffect(() => {
    if (!enabled) return;
    return registerRefreshHandler(handler, { scrollToTop });
  }, [enabled, handler, registerRefreshHandler, scrollToTop]);
}
