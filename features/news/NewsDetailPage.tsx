"use client";

import { ArrowLeft, ArrowRight, Dot, Eye, ImageUp, Link, LoaderCircle, Share, Share2, Star } from "lucide-react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useLocaleContext } from "@/components/providers/locale-provider";
import { usePageRefreshHandler } from "@/components/providers/page-refresh-provider";
import { Button } from "@/components/ui/button";
import {
  favorite,
  fetchNewsDetail,
  fetchNextNewsDetail,
  unFavorite,
  type NewsItemWithStatInfo,
} from "@/lib/api/news";
import { isAuthenticated } from "@/lib/stores/auth-user";
import { formatRelativeTime } from "@/lib/time";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import { AppCenteredState, AppLoadingOverlay, AppModal, AppMobileBackHeader } from "@/components/app";
import { RedbookMark, XMark } from "@/lib/social-icons";
import { updateCurrentAppNavigationPath } from "@/lib/stores/app-session";
import { getLocaleFromPathname } from "@/lib/i18n";
import { buildShareTitle, buildSiteTitle } from "@/lib/seo";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";
import { scrollAppToTop } from "@/lib/app-scroll";
import { optimizeRemoteImageUrl } from "@/lib/image-url";
import { getNewsSourceIconUrl } from "@/lib/news-source-icon";
import { AudioPlayButton } from "@/components/audio/AudioPlayButton";

function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchShareFile(url: string, filename: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) return null;

    return new File([blob], filename, { type: blob.type });
  } catch {
    return null;
  }
}

function scrollNewsDetailToTop() {
  const routeLayer = document.querySelector<HTMLElement>("[data-news-detail-scroll-root]");
  if (routeLayer) {
    routeLayer.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  scrollAppToTop("auto");
}

async function scrollNewsDetailToTopSmooth() {
  const routeLayer = document.querySelector<HTMLElement>("[data-news-detail-scroll-root]");
  if (!routeLayer) {
    await scrollAppToTop("smooth");
    return;
  }

  routeLayer.scrollTo({ top: 0, behavior: "smooth" });
  for (let frame = 0; frame < 120; frame += 1) {
    if (routeLayer.scrollTop <= 1) return;
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
}

export function NewsDetailPage({ id }: { id: number }) {
  const { dictionary, locale } = useLocaleContext();
  const playAudioLabel = dictionary.newsDetail.playAudio || "Play audio";
  const audioFailedLabel = dictionary.newsDetail.audioFailed || "Couldn't play audio";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hideAdjacentNavigation = searchParams.get("source") === "notification";
  const [item, setItem] = useState<NewsItemWithStatInfo | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItemWithStatInfo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);
  const [hasNextNews, setHasNextNews] = useState(true);
  const [favoriting, setFavoriting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [rednoteImageState, setRednoteImageState] = useState<{
    id: number;
    status: "ready" | "error";
  } | null>(null);
  const [xImageState, setXImageState] = useState<{
    id: number;
    status: "ready" | "error";
  } | null>(null);
  const nextLoadingRef = useRef(false);
  const hasNextNewsRef = useRef(true);
  const requestVersionRef = useRef(0);
  const activeIndexRef = useRef(0);
  const newsItemsRef = useRef<NewsItemWithStatInfo[]>([]);
  const rednoteImagePromiseRef = useRef<Promise<File | null> | null>(null);
  const xImagePromiseRef = useRef<Promise<File | null> | null>(null);
  const shareImageRequestRef = useRef<{
    key: string;
    cancelled: boolean;
    rednote: Promise<File | null>;
    x: Promise<File | null>;
  } | null>(null);
  const activeItem = newsItems[activeIndex] ?? item;
  const activeItemId = activeItem?.id;
  const rednoteImageStateMatches = rednoteImageState?.id === activeItemId;
  const rednoteImageReady = rednoteImageStateMatches && rednoteImageState?.status === "ready";
  const rednoteImageLoading = Boolean(activeItemId) && !rednoteImageStateMatches;
  const rednoteImageFailed = rednoteImageStateMatches && rednoteImageState?.status === "error";
  const xImageStateMatches = xImageState?.id === activeItemId;
  const xImageReady = xImageStateMatches && xImageState?.status === "ready";
  const xImageLoading = Boolean(activeItemId) && !xImageStateMatches;
  const xImageFailed = xImageStateMatches && xImageState?.status === "error";

  const prepareShareImages = useCallback(() => {
    if (!activeItemId || typeof window === "undefined") return;

    const locale = getLocaleFromPathname(pathname);
    const requestKey = `${activeItemId}:${locale}`;
    const currentRequest = shareImageRequestRef.current;
    if (currentRequest?.key === requestKey) {
      rednoteImagePromiseRef.current = currentRequest.rednote;
      xImagePromiseRef.current = currentRequest.x;
      return;
    }

    if (currentRequest) {
      currentRequest.cancelled = true;
    }

    setRednoteImageState(null);
    setXImageState(null);

    const imageUrl = new URL("/share/rednote", window.location.origin);
    imageUrl.searchParams.set("id", String(activeItemId));
    imageUrl.searchParams.set("locale", locale);

    const xImageUrl = new URL("/share/x", window.location.origin);
    xImageUrl.searchParams.set("id", String(activeItemId));
    xImageUrl.searchParams.set("locale", locale);

    const imagePromise = fetchShareFile(imageUrl.toString(), `flashmaple-${activeItemId}.png`);
    const xImagePromise = fetchShareFile(xImageUrl.toString(), `flashmaple-x-${activeItemId}.png`);
    const request = {
      key: requestKey,
      cancelled: false,
      rednote: imagePromise,
      x: xImagePromise,
    };
    shareImageRequestRef.current = request;
    rednoteImagePromiseRef.current = imagePromise;
    xImagePromiseRef.current = xImagePromise;

    void imagePromise.then((file) => {
      if (shareImageRequestRef.current === request && !request.cancelled) {
        setRednoteImageState({ id: activeItemId, status: file ? "ready" : "error" });
      }
    });
    void xImagePromise.then((file) => {
      if (shareImageRequestRef.current === request && !request.cancelled) {
        setXImageState({ id: activeItemId, status: file ? "ready" : "error" });
      }
    });
  }, [activeItemId, pathname]);

  useEffect(() => {
    if (shareOpen) prepareShareImages();
  }, [prepareShareImages, shareOpen]);

  useLayoutEffect(() => {
    scrollNewsDetailToTop();
  }, [id]);

  const setItems = useCallback((items: NewsItemWithStatInfo[]) => {
    newsItemsRef.current = items;
    setNewsItems(items);
  }, []);

  const appendItem = useCallback((nextItem: NewsItemWithStatInfo) => {
    setNewsItems((previous) => {
      if (previous.some((newsItem) => newsItem.id === nextItem.id)) {
        newsItemsRef.current = previous;
        return previous;
      }

      const next = [...previous, nextItem];
      newsItemsRef.current = next;
      return next;
    });
  }, []);

  const setActivePageIndex = useCallback((index: number) => {
    if (activeIndexRef.current === index) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const setNextBusy = useCallback((value: boolean) => {
    nextLoadingRef.current = value;
    setNextLoading(value);
  }, []);

  const setNextAvailability = useCallback((value: boolean) => {
    hasNextNewsRef.current = value;
    setHasNextNews(value);
  }, []);

  const load = useCallback(async (targetId = id, preserveNavigation = false) => {
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    setLoading(true);
    setNextBusy(false);
    if (!preserveNavigation) {
      setNextAvailability(true);
      setActivePageIndex(0);
    }
    const result = await fetchNewsDetail(targetId);
    if (requestVersionRef.current !== requestVersion) return;

    if (result.status === "success" && result.data) {
      const refreshedItem = result.data;
      setItem(refreshedItem);
      if (preserveNavigation) {
        setNewsItems((previous) => {
          const itemIndex = previous.findIndex((newsItem) => newsItem.id === targetId);
          if (itemIndex < 0) return previous;

          const next = [...previous];
          next[itemIndex] = refreshedItem;
          newsItemsRef.current = next;
          return next;
        });
      } else {
        setItems([result.data]);
        setActivePageIndex(0);
        setNextAvailability(true);
      }
      setFailed(false);
    } else {
      if (!preserveNavigation) {
        setItem(null);
        setItems([]);
        setFailed(true);
      }
    }
    setLoading(false);
  }, [id, setActivePageIndex, setItems, setNextAvailability, setNextBusy]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void load(id), 0);
    return () => window.clearTimeout(loadTimer);
  }, [id, load]);

  const refreshCurrentArticle = useCallback(async () => {
    await scrollNewsDetailToTopSmooth();
    const currentId = newsItemsRef.current[activeIndexRef.current]?.id ?? id;
    await load(currentId, true);
  }, [id, load]);

  usePageRefreshHandler(refreshCurrentArticle, true, { scrollToTop: false });

  const scrollDetailToTop = useCallback(() => {
    window.requestAnimationFrame(() => {
      scrollNewsDetailToTop();
    });
  }, []);

  const showItemAtIndex = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, newsItemsRef.current.length - 1));
    setActivePageIndex(boundedIndex);
    scrollDetailToTop();
  }, [scrollDetailToTop, setActivePageIndex]);

  const handlePreviousArticle = useCallback(() => {
    if (activeIndexRef.current <= 0) return;
    showItemAtIndex(activeIndexRef.current - 1);
  }, [showItemAtIndex]);

  const handleNextArticle = useCallback(async () => {
    const currentIndex = activeIndexRef.current;
    const existingItems = newsItemsRef.current;

    if (currentIndex < existingItems.length - 1) {
      showItemAtIndex(currentIndex + 1);
      return;
    }

    const sourceId = existingItems[currentIndex]?.id;
    if (!sourceId || nextLoadingRef.current) return;

    if (!hasNextNewsRef.current) {
      showGlobalSnackbar(dictionary.newsDetail.noMoreContent);
      return;
    }

    const requestVersion = requestVersionRef.current;
    setNextBusy(true);
    try {
      const result = await fetchNextNewsDetail(sourceId);
      if (requestVersionRef.current !== requestVersion) return;

      if (result.status === "error") {
        return;
      }

      const nextItem = result.data;
      const existingItems = newsItemsRef.current;
      if (!nextItem || nextItem.id === sourceId || existingItems.some((newsItem) => newsItem.id === nextItem.id)) {
        setNextAvailability(false);
        showGlobalSnackbar(dictionary.newsDetail.noMoreContent);
        return;
      }

      appendItem(nextItem);
      setNextAvailability(true);
      setActivePageIndex(existingItems.length);
      scrollDetailToTop();
    } catch {
      return;
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setNextBusy(false);
      }
    }
  }, [appendItem, dictionary.newsDetail.noMoreContent, scrollDetailToTop, setActivePageIndex, setNextAvailability, setNextBusy, showItemAtIndex]);

  useEffect(() => {
    const activeNews = newsItems[activeIndex];
    if (!activeNews || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("id", String(activeNews.id));
    const nextPath = `${url.pathname}${url.search}${url.hash}`;
    updateCurrentAppNavigationPath(nextPath);
    window.history.replaceState(null, "", nextPath);
    document.title = buildSiteTitle(activeNews.langTitle || activeNews.title || "News");
  }, [activeIndex, newsItems]);

  async function toggleFavorite() {
    const targetItem = activeItem;
    if (!targetItem) return;
    if (!isAuthenticated()) {
      showGlobalSnackbar(dictionary.favorites.loginRequiredDescription);
      return;
    }

    try {
      setFavoriting(true);
      const nextFavorited = !targetItem.favorited;
      const nextFavoriteCount = nextFavorited ? targetItem.favoriteCount + 1 : Math.max(0, targetItem.favoriteCount - 1);
      const res = nextFavorited ? await favorite(targetItem.id) : await unFavorite(targetItem.id);
      if (!res || res.code !== 200) {
        return;
      }
      const updateItem = (newsItem: NewsItemWithStatInfo) =>
        newsItem.id === targetItem.id
          ? { ...newsItem, favorited: nextFavorited, favoriteCount: nextFavoriteCount }
          : newsItem;
      setItem((previous) => (previous ? updateItem(previous) : previous));
      setNewsItems((previous) => {
        const next = previous.map(updateItem);
        newsItemsRef.current = next;
        return next;
      });
    } finally {
      setFavoriting(false);
    }
  }

  const shareData = useMemo(() => {
    if (!activeItem || typeof window === "undefined") return null;

    const shareTitle = buildShareTitle(activeItem.langTitle || activeItem.title || "News");
    const shareDescription = activeItem.langDescription || activeItem.description;
    const url = new URL(window.location.href);
    url.pathname = pathname;
    url.searchParams.delete("source");
    url.searchParams.set("id", String(activeItem.id));
    const shareUrl = url.toString();
    const shareText = [
      shareTitle,
      (activeItem.langTitle ? activeItem.title + '\n' : '') + shareDescription + (activeItem.langDescription ? '\n' + activeItem.description : ''),
      `FlashMaple · ${activeItem.source}`,
      shareUrl,
    ].filter(Boolean).join("\n");

    return {
      title: shareTitle,
      text: shareText,
      url: shareUrl,
    } satisfies ShareData;
  }, [activeItem, pathname]);

  function openSharePanel() {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches) return;
    setShareOpen(true);
  }

  async function handleXShare() {
    if (!shareData || !activeItem || !xImagePromiseRef.current) return;

    const translatedTitle = activeItem.langTitle?.trim();
    const englishTitle = activeItem.title?.trim();
    const text = [
      buildShareTitle(translatedTitle || englishTitle || "News"),
      translatedTitle && englishTitle ? '✨' + englishTitle + '✨' : null,
    ].filter(Boolean).join("\n");

    setShareBusy(true);
    try {
      const file = await xImagePromiseRef.current;
      if (!file || !navigator.canShare?.({ files: [file] })) {
        await navigator.clipboard?.writeText(`${text}\n${shareData.url}`);
        showGlobalSnackbar(dictionary.newsDetail.shareMessage);
        return;
      }

      const xShareData = {
        title: buildShareTitle(translatedTitle || englishTitle || "News"),
        text: `${text}\n${shareData.url}`,
        files: [file],
      } satisfies ShareData;

      if (!navigator.share) {
        await navigator.clipboard?.writeText(`${text}\n${shareData.url}`);
        showGlobalSnackbar(dictionary.newsDetail.shareMessage);
        return;
      }

      setShareOpen(false);
      await navigator.share(xShareData);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await navigator.clipboard?.writeText(`${text}\n${shareData.url}`);
      showGlobalSnackbar(dictionary.newsDetail.shareMessage);
    } finally {
      setShareBusy(false);
    }
  }

  async function handleRednoteShare() {
    if (!shareData || !rednoteImagePromiseRef.current) return;

    setShareBusy(true);
    try {
      const file = await rednoteImagePromiseRef.current;
      if (!file || !navigator.canShare?.({ files: [file] })) {
        await navigator.clipboard?.writeText(shareData.text || shareData.url || window.location.href);
        showGlobalSnackbar(dictionary.newsDetail.shareMessage);
        return;
      }

      setShareOpen(false);
      // Keep the image and editable copy together, but leave out the separate
      // URL field so RedNote can open its editor instead of a file picker.
      const translatedTitle = activeItem?.langTitle?.trim();
      const englishTitle = activeItem?.title?.trim();
      const rednoteTitle = dictionary.newsDetail.sharePostTitle;
      const rednoteContent = [
        translatedTitle || englishTitle || dictionary.newsDetail.shareNewsFallback,
        translatedTitle && englishTitle ? englishTitle : null,
      ].filter(Boolean).map((content) => `✨${content}`).join("\n");
      const rednoteShareData = {
        title: rednoteTitle,
        // RedNote currently maps the first text line to the note title,
        // so repeat the fixed title here and leave the two news titles below it.
        text: `${rednoteTitle}\n${rednoteContent}\n🚀${shareData.url}`,
        files: [file],
      } satisfies ShareData;
      await navigator.share(rednoteShareData);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await navigator.clipboard?.writeText(shareData.text || shareData.url || window.location.href);
      showGlobalSnackbar(dictionary.newsDetail.shareMessage);
    } finally {
      setShareBusy(false);
    }
  }

  async function handleOtherShare() {
    if (!shareData) return;

    setShareOpen(false);
    try {
      if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
        await navigator.clipboard?.writeText(shareData.text || shareData.url || window.location.href);
        showGlobalSnackbar(dictionary.newsDetail.shareMessage);
        return;
      }

      await navigator.share(shareData);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await navigator.clipboard?.writeText(shareData.text || shareData.url || window.location.href);
      showGlobalSnackbar(dictionary.newsDetail.shareMessage);
    }
  }

  if (loading && !item) {
    return <AppLoadingOverlay />;
  }

  if (failed || !item) {
    return (
      <AppCenteredState
        title={dictionary.newsDetail.loadFailedTitle}
        description={dictionary.newsDetail.loadFailedDescription}
        actionLabel={dictionary.newsDetail.loadFailedRetry}
        onAction={() => load()}
      />
    );
  }

  const title = activeItem.langTitle || activeItem.title;
  const description = activeItem.langDescription || activeItem.description;
  const share = typeof window !== "undefined";
  const isChineseLocale = locale === "zh-Hans" || locale === "zh-Hant";
  const redNoteLabel = dictionary.newsDetail.shareRednoteLabel;
  const shareImageLabel = dictionary.newsDetail.shareImageLabel;
  const hasPreviousArticle = activeIndex > 0;
  const canRequestNextArticle = hasNextNews || activeIndex < newsItems.length - 1;
  const nextArticleDisabled = nextLoading || !canRequestNextArticle;
  const originalArticleUrl = safeExternalUrl(activeItem.link);

  return (
    <div>
      <article className="hidden md:flex flex-col p-4">
        {favoriting || nextLoading || loading ? (<AppLoadingOverlay />) : null}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center text-md text-muted-foreground">
            <span className="flex items-center gap-1">
              <Image
                unoptimized
                src={getNewsSourceIconUrl(activeItem.source, activeItem.sourceIconUrl)}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-full"
              />
              {activeItem.source}
            </span>
            <Dot />
            <span>{formatRelativeTime(activeItem.isoPubDate, dictionary)}</span>
            <Dot />
            <span className="flex items-center gap-0.5">
              <Eye />
              {activeItem.readCount ?? 0}
            </span>
          </div>

          <div className="flex gap-1">
            <Button variant="destructive" className="cursor-pointer" onClick={toggleFavorite}>
              <Star className={activeItem.favorited ? "fill-current" : ""} />
              {activeItem.favoriteCount ?? 0}
            </Button>
            {originalArticleUrl && (<Button asChild variant="destructive" className="text-primary cursor-pointer">
                <a href={originalArticleUrl} target="_blank" rel="noreferrer">
                  <Link />
                  {dictionary.newsDetail.viewOriginal}
                </a>
              </Button>
            )}
            {!hideAdjacentNavigation ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={!hasPreviousArticle}
                  onClick={handlePreviousArticle}
                >
                  {dictionary.newsDetail.previousArticle}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={nextArticleDisabled}
                  onClick={handleNextArticle}
                >
                  {dictionary.newsDetail.nextArticle}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {activeItem.imageUrl ? (
          <Image
            unoptimized
            src={optimizeRemoteImageUrl(activeItem.imageUrl, { width: 1200, height: 675 })}
            alt={title}
            width={1200}
            height={675}
            className="aspect-video w-full rounded-lg object-cover"
          />
        ) : null}

        {activeItem.langTitle ? <h1 className="pt-6 text-2xl font-bold">{title}</h1> : null}
        <h1 className={cn("text-xl text-primary italic leading-tight", !activeItem.langTitle && "pt-6 text-2xl font-bold text-foreground not-italic")}>
          {activeItem.title}<AudioPlayButton text={activeItem.title} label={playAudioLabel} errorLabel={audioFailedLabel} />
        </h1>

        {activeItem.langDescription ? <h2 className="pt-6 text-xl">{description}</h2> : null}
        {description ? (
          <h2 className={cn("text-xl text-primary italic leading-tight", !activeItem.langDescription && "pt-6 text-foreground not-italic")}>
            {activeItem.description}<AudioPlayButton text={activeItem.description} label={playAudioLabel} errorLabel={audioFailedLabel} />
          </h2>
        ) : null}
      </article>


      <AppMobileBackHeader
        iconUrl={getNewsSourceIconUrl(activeItem.source, activeItem.sourceIconUrl)}
        title={activeItem.source}
        actions={
          <>
            <Button size="icon" variant="destructive" onClick={toggleFavorite}>
              <Star className={activeItem.favorited ? "fill-current" : ""} />
            </Button>
            {share ? (
              <Button size="icon" variant="destructive" onClick={openSharePanel}>
                <Share />
              </Button>
            ) : null}
          </>
        }
      />
      <div className="md:hidden px-4 pb-24">
        {favoriting || nextLoading || loading ? (<AppLoadingOverlay />) : null}
        <MobileNewsArticle
          item={activeItem}
          dictionary={dictionary}
        />
      </div>
      {!hideAdjacentNavigation ? (
        <div className={cn("app-bottom-chrome fixed inset-x-0 bottom-0 grid grid-cols-2 gap-3 border-t bg-background/92 px-4 pb-(--app-safe-footer-bottom) pt-3 backdrop-blur-xl md:hidden", appZIndex.navigation)}>
          <Button variant="destructive" disabled={!hasPreviousArticle} onClick={handlePreviousArticle} className="text-primary">
            <ArrowLeft />
            {dictionary.newsDetail.previousArticle}
          </Button>
          <Button variant="destructive" disabled={nextArticleDisabled} onClick={handleNextArticle} className="text-primary">
            {dictionary.newsDetail.nextArticle}
            <ArrowRight />
          </Button>
        </div>
      ) : null}

      <AppModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={<span className="block text-center">{dictionary.newsDetail.shareMessage}</span>}
        showCloseButton={false}
        className="top-auto bottom-0 left-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"
      >
        <div className="flex justify-center gap-5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-14 rounded-full text-foreground"
            aria-label="X"
            disabled={shareBusy || !xImageReady}
            onClick={handleXShare}
          >
            <XMark className="size-7" aria-hidden />
            <span className="sr-only">X</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-14 rounded-full text-[#d3001c]"
            disabled={shareBusy || !rednoteImageReady}
            aria-label={isChineseLocale ? redNoteLabel : shareImageLabel}
            onClick={handleRednoteShare}
          >
            {isChineseLocale ? (
              <RedbookMark className="size-8" aria-hidden />
            ) : (
              <ImageUp className="size-7" aria-hidden />
            )}
            <span className="sr-only">{isChineseLocale ? redNoteLabel : shareImageLabel}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-14 rounded-full text-sky-500"
            aria-label="Share"
            onClick={handleOtherShare}
          >
            <Share2 className="size-7" />
            <span className="sr-only">Share</span>
          </Button>
        </div>
        <div className="flex min-h-6 items-center justify-center gap-2 text-sm text-muted-foreground">
            {rednoteImageLoading || xImageLoading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              {dictionary.newsDetail.shareImageLoading}
            </>
          ) : rednoteImageFailed || xImageFailed ? (
            dictionary.newsDetail.shareImageUnavailable
          ) : null}
        </div>
      </AppModal>
    </div>
  );
}

function MobileNewsArticle({item, dictionary,}: {item: NewsItemWithStatInfo; dictionary: ReturnType<typeof useLocaleContext>["dictionary"];}) {
  const title = item.langTitle || item.title;
  const description = item.langDescription || item.description;
  const originalArticleUrl = safeExternalUrl(item.link);

  return (
    <article className="flex min-h-full flex-col py-4">
      {item.langTitle ? <h1 className="text-2xl font-bold">{title}</h1> : null}
      <h1 className={cn("text-xl text-primary italic leading-tight", !item.langTitle && "text-2xl font-bold text-foreground not-italic")}>
        {item.title}<AudioPlayButton text={item.title} label={dictionary.newsDetail.playAudio || "Play audio"} errorLabel={dictionary.newsDetail.audioFailed || "Couldn't play audio"} />
      </h1>

      {item.langDescription ? <h2 className="pt-4 text-xl">{description}</h2> : null}
      {description ? (
        <h2 className={cn("text-xl text-primary italic leading-tight", !item.langDescription && "pt-4 text-foreground not-italic")}>
          {item.description}<AudioPlayButton text={item.description} label={dictionary.newsDetail.playAudio || "Play audio"} errorLabel={dictionary.newsDetail.audioFailed || "Couldn't play audio"} />
        </h2>
      ) : null}

      {item.imageUrl ? (
        <Image
          unoptimized
          src={optimizeRemoteImageUrl(item.imageUrl, { width: 768, height: 432 })}
          alt={title}
          width={768}
          height={432}
          className="mt-4 aspect-video w-full rounded-lg object-cover"
        />
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-md text-muted-foreground">
          <span className="shrink-0">{formatRelativeTime(item.isoPubDate, dictionary)}</span>
          <span className="flex shrink-0 items-center gap-0.5">
            <Eye size={18}/>
            {item.readCount ?? 0}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
            <Star size={18}/>
            {item.favoriteCount ?? 0}
          </span>
        </div>

        {originalArticleUrl ? (
          <Button asChild variant="destructive" className={cn("shrink-0 text-primary cursor-pointer")}>
            <a href={originalArticleUrl} target="_blank" rel="noreferrer">
              <Link />
              {dictionary.newsDetail.viewOriginal}
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
