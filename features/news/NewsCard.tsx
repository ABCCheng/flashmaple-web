"use client";

import Image from "next/image";
import Link from "next/link";
import type { NewsItemFavoriteInfo, NewsItemInfo } from "@/lib/api/news";
import { notifyAppScrollSnapshot } from "@/lib/app-scroll";
import { optimizeRemoteImageUrl } from "@/lib/image-url";
import { Clock, Star } from "lucide-react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedTitle({ text, keyword }: { text: string; keyword?: string }) {
  const keywords = keyword?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!keywords.length) return text;

  const parts = text.split(
    new RegExp(`(${keywords.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "giu")
  );
  const comparableKeywords = new Set(keywords.map((item) => item.toLocaleLowerCase()));

  return parts.map((part, index) =>
    comparableKeywords.has(part.toLocaleLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-sm bg-destructive/10 text-destructive dark:bg-destructive/20 px-0.5"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function NewsCard({
  item,
  time,
  detailHref,
  highlightKeyword,
}: {
  item: NewsItemInfo;
  time: string;
  detailHref: string;
  highlightKeyword?: string;
}) {
  const title = item.langTitle || item.title;

  return (
    <div className="rounded-lg border bg-transparent text-card-foreground shadow-sm backdrop-blur-xl p-2">

      {/* ================= Desktop ================= */}
      <div className="hidden md:flex justify-between gap-4 overflow-hidden">

        <div className="flex flex-1 flex-col justify-between"> 
          <div className="flex flex-1 flex-col gap-2">
            {/* Title clickable only */}
            <Link href={detailHref} prefetch={false} scroll={false} className="block">
              <h2 className="font-semibold text-lg leading-snug mt-1 ml-1 line-clamp-2 hover:text-primary">
                <HighlightedTitle text={title} keyword={highlightKeyword} />
              </h2>
            </Link>

            {/* Subtitle (not clickable) */}
            {item.langTitle ? (
              <p className="line-clamp-3 ml-1 mt-0 text-md leading-5 text-muted-foreground">
                <HighlightedTitle text={item.title} keyword={highlightKeyword} />
              </p>
            ) : null}
          </div>

          {/* Meta (not clickable) */}
          <div className="flex items-center justify-start ml-1 mb-1 gap-2 text-sm text-muted-foreground">
            <span className="truncate">{item.source}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0">{time}</span>
          </div>
        </div>

        {/* Image clickable only */}
        {item.imageUrl ? (
          <Link href={detailHref} prefetch={false} scroll={false}>
            <Image
              unoptimized
              src={optimizeRemoteImageUrl(item.imageUrl, { width: 568, height: 320 })}
              alt={title}
              width={284}
              height={160}
              className="h-40 aspect-video object-cover rounded-md"
            />
          </Link>
        ) : null}
      </div>

      {/* ================= Mobile ================= */}
      <div className="md:hidden flex gap-1 flex-col justify-between">
        {/* Title clickable only */}
        <Link href={detailHref} prefetch={false} scroll={false} className="block">
          <h2 className="font-semibold text-md leading-snug line-clamp-2 hover:text-primary">
            <HighlightedTitle text={title} keyword={highlightKeyword} />
          </h2>
        </Link>

        {/* Subtitle */}
        {item.langTitle ? (
          <p className="line-clamp-3 text-sm text-muted-foreground italic leading-tight">
            <HighlightedTitle text={item.title} keyword={highlightKeyword} />
          </p>
        ) : null}

        {/* Image clickable only */}
        {item.imageUrl ? (
          <Link href={detailHref} prefetch={false} scroll={false}>
            <Image
              unoptimized
              src={optimizeRemoteImageUrl(item.imageUrl, { width: 768, height: 432 })}
              alt={title}
              width={768}
              height={432}
              className="w-full aspect-video object-cover rounded-md"
            />
          </Link>
        ) : null}

        {/* Meta (not clickable) */}
        <div className="flex items-center justify-start gap-2 text-xs text-muted-foreground">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">{time}</span>
        </div>
      </div>

    </div>
  );
}

export function NewsFavoriteCard({
  item,
  pubTime,
  favoriteTime,
  detailHref,
  highlightKeyword,
}: {
  item: NewsItemFavoriteInfo;
  pubTime: string;
  favoriteTime: string;
  detailHref: string;
  highlightKeyword?: string;
}) {
  const title = item.langTitle || item.title;

  return (
    <div className="rounded-lg border bg-transparent text-card-foreground shadow-sm backdrop-blur-xl p-2">

      {/* ================= Desktop ================= */}
      <div className="hidden md:flex justify-between gap-4 overflow-hidden">
        <div className="flex flex-1 flex-col justify-between"> 
          <div className="flex flex-1 flex-col gap-2">
            {/* Title clickable only */}
            <Link href={detailHref} prefetch={false} scroll={false} className="block" onClick={notifyAppScrollSnapshot}>
              <h2 className="font-semibold text-lg leading-snug mt-1 ml-1 line-clamp-2 hover:text-primary">
                <HighlightedTitle text={title} keyword={highlightKeyword} />
              </h2>
            </Link>

            {/* Subtitle (not clickable) */}
            {item.langTitle ? (
              <p className="line-clamp-3 ml-1 mt-0 text-md leading-5 text-muted-foreground">
                <HighlightedTitle text={item.title} keyword={highlightKeyword} />
              </p>
            ) : null}
          </div>

          {/* Meta (not clickable) */}
          <div className="flex items-center justify-start ml-1 mb-1 gap-2 text-sm text-muted-foreground">
            <span className="truncate">{item.source}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 flex items-center gap-1"><Clock size={18} /> {pubTime}</span>
            <span className="shrink-0">·</span>
            <span className="shrink-0 flex items-center gap-1"><Star size={18} /> {favoriteTime}</span>
          </div>
        </div>

        {/* Image clickable only */}
        {item.imageUrl ? (
          <Link href={detailHref} prefetch={false} scroll={false} onClick={notifyAppScrollSnapshot}>
            <Image
              unoptimized
              src={optimizeRemoteImageUrl(item.imageUrl, { width: 568, height: 320 })}
              alt={title}
              width={284}
              height={160}
              className="h-40 aspect-video object-cover rounded-md"
            />
          </Link>
        ) : null}
      </div>

      {/* ================= Mobile ================= */}
      <div className="flex flex-col md:hidden gap-2 items-start">
        <div className="flex gap-1 items-start">
          <div className="flex-1 flex flex-col items-start">
            <Link href={detailHref} prefetch={false} scroll={false} className="block" onClick={notifyAppScrollSnapshot}>
              <h2 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-primary">
                <HighlightedTitle text={title} keyword={highlightKeyword} />
              </h2>
            </Link>
            {/* Subtitle */}
            {item.langTitle ? (
              <p className="line-clamp-3 italic leading-tight text-sm text-muted-foreground">
                <HighlightedTitle text={item.title} keyword={highlightKeyword} />
              </p>
            ) : null}
          </div>

          {/* Image clickable only */}
          {item.imageUrl ? (
            <Link href={detailHref} prefetch={false} scroll={false} onClick={notifyAppScrollSnapshot}>
              <Image
                unoptimized
                src={optimizeRemoteImageUrl(item.imageUrl, { width: 176, height: 160 })}
                alt={title}
                width={88}
                height={80}
                className="h-20 w-22 rounded-sm object-cover"
              />
            </Link>
          ) : null}
        </div>
        {/* Meta (not clickable) */}
        <div className="flex items-center justify-start gap-1 text-xs text-muted-foreground">
          <span className="truncate">{item.source}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0 flex items-center gap-0.5"><Clock size={12} /> {pubTime}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0 flex items-center gap-0.5"><Star size={12} /> {favoriteTime}</span>
        </div>
      </div>

    </div>
  );
}
