import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n";
import { PUBLIC_SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteHost = new URL(PUBLIC_SITE_URL).host;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...locales.filter((locale) => locale !== "en").map((locale) => `/${locale}`)],
      disallow: ["/api/", "/app/"],
    },
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
    host: siteHost,
  };
}
