import "server-only";

import { fetchNewsDetailForSeo } from "@/lib/api/news-server";
import { defaultLocale, isLocale, localizePath, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export async function getShareImageData(request: Request) {
  const requestUrl = new URL(request.url);
  const id = Number(requestUrl.searchParams.get("id"));
  const localeValue = requestUrl.searchParams.get("locale");
  const locale: Locale = localeValue && isLocale(localeValue) ? localeValue : defaultLocale;

  if (!Number.isInteger(id) || id <= 0) return null;

  const item = await fetchNewsDetailForSeo(id, locale);
  if (!item) return null;

  let imageUrl = new URL("/og.png", SITE_URL).toString();
  if (item.imageUrl) {
    try {
      const candidate = new URL(item.imageUrl, SITE_URL);
      if (candidate.protocol === "http:" || candidate.protocol === "https:") {
        imageUrl = candidate.toString();
      }
    } catch {
      // Use the branded fallback image when the source image URL is invalid.
    }
  }

  return {
    item,
    imageUrl,
    title: item.langTitle?.trim() || item.title?.trim() || "News",
    originalTitle: item.langTitle?.trim() ? item.title?.trim() || "" : "",
    description: item.langDescription?.trim() || item.description?.trim() || "",
    originalDescription: item.langDescription?.trim() ? item.description?.trim() || "" : "",
    source: item.source?.trim() || "FlashMaple",
    locale,
    logoUrl: new URL("/logo-512.png", SITE_URL).toString(),
    detailUrl: new URL(localizePath(`/news/detail?id=${encodeURIComponent(String(id))}`, locale), SITE_URL).toString(),
  };
}
