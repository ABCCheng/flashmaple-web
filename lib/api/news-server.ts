import "server-only";

import { API_ORIGIN } from "@/lib/env";
import { DEFAULT_REGION } from "@/lib/stores/region";
import type { Locale } from "@/lib/i18n";
import type { NewsItemInfo } from "@/lib/api/news";
import type { ApiResponse } from "@/lib/api/types";

export async function fetchNewsDetailForSeo(id: number, locale: Locale) {
  if (!Number.isInteger(id) || id <= 0) return null;

  try {
    const response = await fetch(
      new URL(`/api/flash/news-item/detail-item?id=${encodeURIComponent(String(id))}`, API_ORIGIN),
      {
        headers: {
          "X-Language": locale,
          "X-Region": DEFAULT_REGION,
        },
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as ApiResponse<NewsItemInfo>;
    return payload.code === 200 && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}
