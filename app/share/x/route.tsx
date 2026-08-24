import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getShareImageData } from "@/lib/share-image-data";

export const runtime = "nodejs";

async function fetchImageDataUrl(url: string) {
  try {
    const origin = new URL(url).origin;
    const response = await fetch(url, {
      cache: "force-cache",
      headers: {
        Accept: "image/jpeg,image/png;q=0.9",
        Referer: `${origin}/`,
        "User-Agent": "Mozilla/5.0 (compatible; FlashMaple/1.0)",
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";", 1)[0];
    if (contentType !== "image/jpeg" && contentType !== "image/png") return null;

    const imageBytes = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${imageBytes.toString("base64")}`;
  } catch {
    return null;
  }
}

async function readFallbackImageDataUrl() {
  try {
    const bytes = await readFile(join(process.cwd(), "public", "og.png"));
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const data = await getShareImageData(request);
  const fallbackUrl = new URL("/og.png", request.url).toString();
  const imageSource = await fetchImageDataUrl(data?.imageUrl ?? fallbackUrl)
    ?? await readFallbackImageDataUrl();

  if (!imageSource) return Response.redirect(fallbackUrl, 302);

  const image = (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#050816",
      }}
    >
      {/* ImageResponse requires a native img element here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSource}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );

  try {
    return new ImageResponse(image, {
      width: 1729,
      height: 910,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      }
    });
  } catch {
    return Response.redirect(new URL("/og.png", request.url));
  }
}
