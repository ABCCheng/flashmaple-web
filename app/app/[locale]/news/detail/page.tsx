import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NewsDetailPage } from "@/features/news/NewsDetailPage";
import { fetchNewsDetailForSeo } from "@/lib/api/news-server";
import { defaultLocale, dictionaries, isLocale } from "@/lib/i18n";
import { buildNoIndexMetadata, buildShareTitle, buildSiteTitle } from "@/lib/seo";
import { PUBLIC_SITE_URL, SITE_NAME } from "@/lib/site";

type NewsDetailRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
};

function absoluteMediaUrl(url: string) {
  const fallback = new URL("/logo-512.png", PUBLIC_SITE_URL).toString();
  if (!url) return fallback;

  try {
    const mediaUrl = new URL(url, PUBLIC_SITE_URL);
    return mediaUrl.protocol === "http:" || mediaUrl.protocol === "https:"
      ? mediaUrl.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

function buildDetailFallbackMetadata(title: string): Metadata {
  const metadata = buildNoIndexMetadata(title);
  const fallbackImage = new URL("/og.png", PUBLIC_SITE_URL).toString();

  return {
    ...metadata,
    openGraph: {
      images: [{ url: fallbackImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [fallbackImage],
    },
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: NewsDetailRouteProps): Promise<Metadata> {
  const [{ locale }, { id }] = await Promise.all([params, searchParams]);
  const normalizedLocale = isLocale(locale) ? locale : defaultLocale;
  const newsId = Number(id);

  if (!isLocale(locale) || !Number.isInteger(newsId) || newsId <= 0) {
    return buildDetailFallbackMetadata(buildSiteTitle(dictionaries[normalizedLocale].tabs.explore));
  }

  const item = await fetchNewsDetailForSeo(newsId, normalizedLocale);
  if (!item) {
    return buildDetailFallbackMetadata(buildSiteTitle(dictionaries[normalizedLocale].tabs.explore));
  }

  const articleTitle = item.langTitle || item.title || "News";
  const title = buildSiteTitle(articleTitle);
  const shareTitle = buildShareTitle(articleTitle);
  const description = item.langDescription || item.description || articleTitle;
  const canonical = new URL(
    `/app/${normalizedLocale}/news/detail?id=${encodeURIComponent(String(newsId))}`,
    PUBLIC_SITE_URL
  ).toString();
  const image = absoluteMediaUrl(item.imageUrl);
  const twitterImageUrl = new URL("/share/x", PUBLIC_SITE_URL);
  twitterImageUrl.searchParams.set("id", String(newsId));
  twitterImageUrl.searchParams.set("locale", normalizedLocale);
  const twitterImage = twitterImageUrl.toString();
  const openGraphImage = {
    url: image,
    alt: articleTitle,
  };

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: SITE_NAME,
      locale: normalizedLocale,
      title: shareTitle,
      description,
      publishedTime: item.isoPubDate || undefined,
      authors: item.source ? [item.source] : undefined,
      images: [openGraphImage],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [twitterImage],
    },
  };
}

export default async function LocalizedNewsDetailQueryRoute({
  params,
  searchParams,
}: NewsDetailRouteProps) {
  const [{ locale }, { id }] = await Promise.all([params, searchParams]);
  const newsId = Number(id);
  if (!isLocale(locale) || !Number.isInteger(newsId) || newsId <= 0) notFound();

  return <NewsDetailPage id={newsId} />;
}
