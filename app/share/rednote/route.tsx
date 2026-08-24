import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { getShareImageData } from "@/lib/share-image-data";
import { getShareFonts } from "@/lib/share-font";

export const runtime = "nodejs";

const REDNOTE_IMAGE_WIDTH = 1242;
const REDNOTE_IMAGE_HEIGHT = 1660;
const REDNOTE_NEWS_IMAGE_HEIGHT = 550;
const REDNOTE_NEWS_ASPECT_HEIGHT = Math.round(REDNOTE_IMAGE_WIDTH * 9 / 16);
const REDNOTE_FOOTER_HEIGHT = 110;
const REDNOTE_MIN_FOOTER_GAP = 38;
const REDNOTE_TITLE_FONT_SIZE = 68;
const REDNOTE_ORIGINAL_TITLE_FONT_SIZE = 52;
const REDNOTE_BODY_FONT_SIZE = 38;
const REDNOTE_TITLE_LINE_HEIGHT = 1.22;
const REDNOTE_ORIGINAL_TITLE_LINE_HEIGHT = 1.22;
const REDNOTE_BODY_LINE_HEIGHT = 1.42;
const REDNOTE_ORIGINAL_TITLE_COLOR = "#a92f45";
const REDNOTE_ORIGINAL_BODY_COLOR = "#c04a60";
const REDNOTE_BRAND_COLOR = "#d3001c";
const REDNOTE_DEFAULT_LIGHT_BACKGROUND =
  "radial-gradient(circle at 15% 5%, rgba(211, 0, 28, 0.1), transparent 480px)";
const REDNOTE_TEXT_BUDGET =
  REDNOTE_IMAGE_HEIGHT -
  REDNOTE_NEWS_IMAGE_HEIGHT -
  38 -
  30 -
  REDNOTE_FOOTER_HEIGHT -
  REDNOTE_MIN_FOOTER_GAP;

function detectImageContentType(bytes: Uint8Array, url: string, headerValue: string | null) {
  const headerType = headerValue?.split(";", 1)[0]?.trim().toLowerCase();
  if (headerType?.startsWith("image/")) return headerType;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "image/gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) {
    return "image/avif";
  }

  const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
  return extension === "jpg" || extension === "jpeg"
    ? "image/jpeg"
    : extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "gif"
          ? "image/gif"
          : null;
}

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

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = detectImageContentType(bytes, url, response.headers.get("content-type"));
    if (!contentType) return null;
    if (contentType !== "image/jpeg" && contentType !== "image/png") return null;

    return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
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

function getShareTypography({
  title,
  originalTitle,
  description,
  originalDescription,
}: {
  title: string;
  originalTitle: string;
  description: string;
  originalDescription: string;
}) {
  const sizes = {
    titleFontSize: REDNOTE_TITLE_FONT_SIZE,
    originalTitleFontSize: REDNOTE_ORIGINAL_TITLE_FONT_SIZE,
    bodyFontSize: REDNOTE_BODY_FONT_SIZE,
  };
  return {
    ...sizes,
    title,
    originalTitle,
    titleLineHeight: REDNOTE_TITLE_LINE_HEIGHT,
    originalTitleLineHeight: REDNOTE_ORIGINAL_TITLE_LINE_HEIGHT,
    bodyLineHeight: REDNOTE_BODY_LINE_HEIGHT,
    originalBodyLineHeight: REDNOTE_BODY_LINE_HEIGHT,
    description,
    originalDescription,
  };
}

export async function GET(request: Request) {
  const data = await getShareImageData(request);
  if (!data) return new Response("News not found", { status: 404 });
  const imageSource = await fetchImageDataUrl(data.imageUrl) ?? await readFallbackImageDataUrl();
  if (!imageSource) return new Response("Share image source unavailable", { status: 502 });
  const shareFonts = await getShareFonts();
  const orderedFonts = data.locale === "pa"
    ? [...shareFonts].sort((left, right) => {
        if (left.name === "FlashMaple Gurmukhi") return -1;
        if (right.name === "FlashMaple Gurmukhi") return 1;
        return 0;
      })
    : shareFonts;
  const fontFamily = orderedFonts.length
    ? `${orderedFonts.map((font) => font.name).join(", ")}, geist`
    : "geist";

  const typography = getShareTypography({
    title: `FlashMaple - ${data.title}`,
    originalTitle: data.originalTitle,
    description: data.description,
    originalDescription: data.originalDescription,
  });

  const image = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        backgroundImage: REDNOTE_DEFAULT_LIGHT_BACKGROUND,
        color: "#111827",
        fontFamily,
        borderRadius: "28px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: `${REDNOTE_NEWS_IMAGE_HEIGHT}px`,
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
          {/* ImageResponse requires a native img element here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
          src={imageSource}
          alt=""
          style={{
            display: "flex",
            width: `${REDNOTE_IMAGE_WIDTH}px`,
            height: `${REDNOTE_NEWS_ASPECT_HEIGHT}px`,
            flexShrink: 0,
            borderTopLeftRadius: "28px",
            borderTopRightRadius: "28px",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          height: `${REDNOTE_IMAGE_HEIGHT - REDNOTE_NEWS_IMAGE_HEIGHT}px`,
          position: "relative",
          padding: "38px 64px 30px",
          boxSizing: "border-box",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          backgroundImage: REDNOTE_DEFAULT_LIGHT_BACKGROUND,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            height: `${REDNOTE_TEXT_BUDGET}px`,
            maxHeight: `${REDNOTE_TEXT_BUDGET}px`,
            overflow: "hidden",
          }}
        >
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            fontSize: `${typography.titleFontSize}px`,
            fontWeight: 800,
            lineHeight: typography.titleLineHeight,
            WebkitTextStrokeWidth: "1px",
            WebkitTextStrokeColor: "#111827",
            wordBreak: "break-word",
          }}
        >
          {typography.title}
        </div>
        {typography.originalTitle ? (
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              paddingTop: "12px",
              fontSize: `${typography.originalTitleFontSize}px`,
              lineHeight: typography.originalTitleLineHeight,
              color: REDNOTE_ORIGINAL_TITLE_COLOR,
              wordBreak: "break-word",
            }}
          >
            {typography.originalTitle}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            paddingTop: "28px",
            fontSize: `${typography.bodyFontSize}px`,
            lineHeight: typography.bodyLineHeight,
            color: "#1f2937",
            wordBreak: "break-word",
          }}
        >
          {typography.description}
        </div>
        {data.originalDescription ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              height: 0,
              paddingTop: "16px",
              boxSizing: "border-box",
              fontSize: `${typography.bodyFontSize}px`,
              lineHeight: typography.originalBodyLineHeight,
              color: REDNOTE_ORIGINAL_BODY_COLOR,
              overflow: "hidden",
              wordBreak: "normal",
              overflowWrap: "normal",
            }}
          >
            {typography.originalDescription}
          </div>
        ) : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            position: "absolute",
            left: "64px",
            right: "64px",
            bottom: "30px",
            height: `${REDNOTE_FOOTER_HEIGHT}px`,
            boxSizing: "border-box",
            paddingTop: "24px",
            borderTop: "2px solid #e5e7eb",
            backgroundColor: "rgba(255, 255, 255, 0.72)",
            zIndex: 2,
            fontSize: "32px",
            lineHeight: 1.18,
            color: "#6b7280",
          }}
        >
          {/* ImageResponse requires a native img element here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.logoUrl}
            alt=""
            width="84"
            height="84"
            style={{ width: "84px", height: "84px", flexShrink: 0, borderRadius: "18px", marginRight: "20px" }}
          />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", color: REDNOTE_BRAND_COLOR, fontWeight: 700 }}>
              FlashMaple · {data.source}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "4px",
                fontSize: "30px",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
              }}
            >
              {data.detailUrl}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  try {
    return new ImageResponse(image, {
      width: REDNOTE_IMAGE_WIDTH,
      height: REDNOTE_IMAGE_HEIGHT,
      fonts: shareFonts.length ? shareFonts : undefined,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      }
    });
  } catch {
    return new Response("Share image generation failed", { status: 500 });
  }
}
