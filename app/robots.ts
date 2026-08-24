import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteHost = new URL(SITE_URL).host;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...locales.filter((locale) => locale !== "en").map((locale) => `/${locale}`)],
      disallow: ["/api/", "/app/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: siteHost,
  };
}
