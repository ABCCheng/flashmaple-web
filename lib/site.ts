const localSiteUrl = "http://localhost:3900";

export const SITE_NAME = "FlashMaple";

function normalizeSiteUrl(value: string | undefined) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) {
    if (process.env.NEXT_PUBLIC_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL must be configured for a production build.");
    }
    return localSiteUrl;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const PUBLIC_SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
