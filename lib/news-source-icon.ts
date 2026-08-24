const NEWS_SOURCE_ICON_FILENAMES: Record<string, string> = {
  "CBC News": "cbc-news.png",
  "Global News": "global-news.png",
  "Toronto Star": "toronto-star.png",
  "Toronto Sun": "toronto-sun.png",
  "Vancouver Sun": "vancouver-sun.png",
  "Calgary Sun": "calgary-sun.png",
  "Edmonton Sun": "edmonton-sun.png",
};

const DEFAULT_NEWS_SOURCE_ICON_URL = "/logo-512.png";

export function getNewsSourceIconUrl(source: string, fallbackUrl?: string) {
  const filename = NEWS_SOURCE_ICON_FILENAMES[source.trim()];
  return filename ? `/news-source-icon/${filename}` : fallbackUrl || DEFAULT_NEWS_SOURCE_ICON_URL;
}
