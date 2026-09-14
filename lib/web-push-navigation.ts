import { isLocale } from "@/lib/i18n";

// The source controls detail actions only; navigation uses ordinary history.
export function getPushDetailPath(value: string, origin: string) {
  try {
    const url = new URL(value, origin);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = url.searchParams.get("id");
    if (url.origin !== origin || parts.length !== 4 || parts[0] !== "app" ||
        !isLocale(parts[1]) || parts[2] !== "news" || parts[3] !== "detail" ||
        !id || !/^[1-9]\d*$/.test(id)) return null;
    return `/app/${parts[1]}/news/detail?id=${id}&source=notification`;
  } catch {
    return null;
  }
}
