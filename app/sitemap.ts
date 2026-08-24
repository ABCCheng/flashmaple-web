import type { MetadataRoute } from "next";

import { homePath, locales, type Locale } from "@/lib/i18n";
import { PUBLIC_SITE_URL } from "@/lib/site";

function absoluteUrl(path: string) {
  return `${PUBLIC_SITE_URL}${path === "/" ? "" : path}`;
}

function languageAlternates() {
  return {
    "x-default": absoluteUrl("/"),
    ...Object.fromEntries(
      locales.map((locale) => [locale, absoluteUrl(homePath("/", locale))])
    ),
  } satisfies Record<string, string>;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.map((locale: Locale) => ({
    url: absoluteUrl(homePath("/", locale)),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: locale === "en" ? 1 : 0.8,
    alternates: { languages: languageAlternates() },
  }));
}
