type ImageSize = {
  width: number;
  height?: number;
};

export function optimizeRemoteImageUrl(src: string, size: ImageSize) {
  if (!src) return src;

  try {
    const url = new URL(src);
    if (url.searchParams.has("sig")) return src;

    if (url.searchParams.has("w")) {
      url.searchParams.set("w", String(size.width));
    }

    if (size.height && url.searchParams.has("h")) {
      url.searchParams.set("h", String(size.height));
    }

    if (url.searchParams.has("quality")) {
      const currentQuality = Number(url.searchParams.get("quality"));
      url.searchParams.set("quality", String(Number.isFinite(currentQuality) ? Math.min(currentQuality, 70) : 70));
    }

    if (url.searchParams.has("strip")) {
      url.searchParams.set("strip", "all");
    }

    return url.toString();
  } catch {
    return src;
  }
}
