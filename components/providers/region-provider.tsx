"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  DEFAULT_REGION,
  getStoredRegion,
  regions,
  subscribeRegion,
  setStoredRegion,
  type RegionCode,
} from "@/lib/stores/region";

export { regions, type RegionCode } from "@/lib/stores/region";

type RegionContextValue = {
  region: RegionCode;
  regionLabel: string;
  setRegion: (region: RegionCode) => void;
};

const defaultRegion = DEFAULT_REGION;

const RegionContext = createContext<RegionContextValue>({
  region: defaultRegion,
  regionLabel: defaultRegion,
  setRegion: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const region = useSyncExternalStore(subscribeRegion, getStoredRegion, () => defaultRegion);

  const setRegion = useCallback((nextRegion: RegionCode) => {
    setStoredRegion(nextRegion);
  }, []);

  const value = useMemo(() => {
    const regionLabel = regions.find((item) => item.code === region)?.label ?? defaultRegion;
    return { region, regionLabel, setRegion };
  }, [region, setRegion]);

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegionContext() {
  return useContext(RegionContext);
}
