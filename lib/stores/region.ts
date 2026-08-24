import { readStorage, writeStorage } from "./storage";

export const regions = [
  { code: "Toronto", label: "Toronto" },
  { code: "Vancouver", label: "Vancouver" },
  { code: "Montreal", label: "Montreal" },
  { code: "Calgary", label: "Calgary" },
  { code: "Winnipeg", label: "Winnipeg" },
  { code: "Saskatoon", label: "Saskatoon" },
  { code: "Halifax", label: "Halifax" },
] as const;

export type RegionCode = (typeof regions)[number]["code"];

export const DEFAULT_REGION: RegionCode = "Toronto";
export const REGION_STORAGE_KEY = "FLASH_MAPLE_REGION";
export const REGION_CHANGE_EVENT = "flashmaple:region-change";

let volatileRegion: RegionCode | null = null;

function isRegion(value: string | null): value is RegionCode {
  return regions.some((region) => region.code === value);
}

export function getStoredRegion(): RegionCode {
  if (typeof window === "undefined") return DEFAULT_REGION;

  const stored = readStorage(REGION_STORAGE_KEY);
  if (isRegion(stored)) return stored;

  return volatileRegion ?? DEFAULT_REGION;
}

export function setStoredRegion(region: RegionCode) {
  volatileRegion = region;
  writeStorage(REGION_STORAGE_KEY, region);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REGION_CHANGE_EVENT));
}

export function subscribeRegion(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === REGION_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(REGION_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(REGION_CHANGE_EVENT, listener);
  };
}
