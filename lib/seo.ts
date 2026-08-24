import type { Metadata } from "next";

import { defaultLocale, dictionaries, locales, type Locale } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function buildSiteTitle(label: string) {
  const normalizedLabel = label.trim();
  return normalizedLabel ? `${SITE_NAME} - ${normalizedLabel}` : SITE_NAME;
}

export function buildShareTitle(label: string) {
  const normalizedLabel = label.trim();
  return normalizedLabel ? `【${SITE_NAME}】${normalizedLabel}` : `【${SITE_NAME}】`;
}

export function buildHomeMetadata(locale: Locale): Metadata {
  const copy = dictionaries[locale].homePage;
  const homeUrl = (nextLocale: Locale) => `${SITE_URL}${nextLocale === defaultLocale ? "" : `/${nextLocale}`}`;
  const canonical = homeUrl(locale);

  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    alternates: {
      canonical,
      languages: {
        "x-default": homeUrl(defaultLocale),
        ...Object.fromEntries(locales.map((nextLocale) => [nextLocale, homeUrl(nextLocale)])),
      },
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      locale,
      title: copy.seoTitle,
      description: copy.seoDescription,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: copy.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.seoTitle,
      description: copy.seoDescription,
      images: ["/og.png"],
    },
  };
}

export function buildNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}
