import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

type ShareFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400;
  style: "normal";
};

const fontSources = [
  {
    name: "FlashMaple CJK",
    paths: [
      "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
      "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.otf",
      "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.otf",
    ],
  },
  {
    name: "FlashMaple Gurmukhi",
    paths: [
      join(process.cwd(), "public", "fonts", "NotoSansGurmukhi-Regular.ttf"),
      "/System/Library/Fonts/Supplemental/Gurmukhi.ttf",
      "/System/Library/Fonts/Supplemental/Gurmukhi Sangam MN.ttc",
      "/System/Library/Fonts/Supplemental/Gurmukhi MN.ttc",
      "/System/Library/Fonts/Supplemental/NotoSansGurmukhi-Regular.ttf",
      "/usr/share/fonts/opentype/noto/NotoSansGurmukhi-Regular.ttf",
      "/usr/share/fonts/truetype/noto/NotoSansGurmukhi-Regular.ttf",
    ],
  },
];

type FontSource = (typeof fontSources)[number];

let fontPromise: Promise<ShareFont[]> | null = null;

async function loadFont(source: FontSource): Promise<ShareFont | null> {
  for (const fontPath of source.paths) {
    try {
      const fontBuffer = await readFile(fontPath);
      return {
        name: source.name,
        data: new Uint8Array(fontBuffer).buffer,
        weight: 400,
        style: "normal",
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function loadFonts(): Promise<ShareFont[]> {
  const fonts = await Promise.all(fontSources.map(loadFont));
  return fonts.filter((font): font is ShareFont => font !== null);
}

export function getShareFonts() {
  fontPromise ??= loadFonts();
  return fontPromise;
}
