"use client";

import { AlertTriangle, ArrowDownUp, Bus, ChevronDown, Clock3, Eye, CircleCheck, Info, ListChevronsDownUp, ListChevronsUpDown, MapPin, Newspaper, OctagonX, Route, Siren, Sparkles, Target, TrainFront } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PullToRefreshIndicator, PullToRefreshSurface, usePullToRefresh } from "@/components/list";
import { AppCenteredState, AppLoadingOverlay, AppMobileStickyHeader, AppMobileStickyHeaderSpacer, createCachedResourceCache, useCachedResource } from "@/components/app";
import { useFlashMoodContext } from "@/components/providers/flash-mood-provider";
import { usePageRefreshContext, usePageRefreshHandler } from "@/components/providers/page-refresh-provider";
import {
  fetchNewsFlash,
  type FlashBriefingInfo,
  type FlashBriefingPointInfo,
  type FlashInfo,
  type FlashNewsItemInfo,
  type TransitAlertInfo,
} from "@/lib/api/news";
import { scrollAppToTop } from "@/lib/app-scroll";
import { optimizeRemoteImageUrl } from "@/lib/image-url";
import { hasLocalePrefix, localizePath, stripLocaleFromPathname, t, type Dictionary, type Locale } from "@/lib/i18n";
import { formatTime12Hour } from "@/lib/time";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { useRegionContext } from "@/components/providers/region-provider";
import { AddToHomeScreenButton } from "@/components/shell/AddToHomeScreenButton";
import { WebPushLinkButton } from "@/features/web-push/WebPushLinkButton";

const flashCache = createCachedResourceCache<FlashInfo>();
const FLASH_REQUEST_TIMEOUT_MS = 10000;

function flashCacheKey(locale: string, region: string) {
  return `flash:${locale}:${region}`;
}

export function FlashPage() {
  const { dictionary, locale } = useLocaleContext();
  const { region, regionLabel } = useRegionContext();
  const { setMood } = useFlashMoodContext();
  const { refreshing: desktopRefreshing } = usePageRefreshContext();
  const pathname = usePathname();
  const isFlashRouteActive = stripLocaleFromPathname(pathname) === "/";
  const currentCacheKey = flashCacheKey(locale, region);
  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FLASH_REQUEST_TIMEOUT_MS);
    return fetchNewsFlash(region, controller.signal).finally(() => {
      window.clearTimeout(timeout);
    });
  }, [region]);
  const { data, loading, failed, load } = useCachedResource({
    cache: flashCache,
    cacheKey: currentCacheKey,
    fetch: fetchData,
  });
  const initialLoadSettledRef = useRef(false);
  const previousPresentedDataRef = useRef<FlashInfo | null>(data);
  const [contentRevision, setContentRevision] = useState(0);

  useLayoutEffect(() => {
    if (data) setMood(data.topStoryMood);
  }, [data, setMood]);

  useLayoutEffect(() => {
    if (!data || previousPresentedDataRef.current === data) return;
    previousPresentedDataRef.current = data;
    setContentRevision((revision) => revision + 1);
  }, [data]);

  const refreshPage = useCallback(async () => {
    await load(true);
  }, [load]);

  usePageRefreshHandler(refreshPage, isFlashRouteActive);

  const topStories = data?.topStoryList ?? [];
  const notice = data?.greeting || undefined;
  const briefing = data?.briefing
    ? {
        ...data.briefing,
        focusList: data.briefing.focusList ?? [],
        watchList: data.briefing.watchList ?? [],
      }
    : null;
  const subwayAlerts = data?.transitStatus?.alerts ?? [];
  const labels: FlashLabels = {
    briefing: t(dictionary, "flash.briefing"),
    focus: t(dictionary, "flash.focus"),
    watch: t(dictionary, "flash.watch"),
    expandDetails: t(dictionary, "flash.expandDetails"),
    collapseDetails: t(dictionary, "flash.collapseDetails"),
    transit: t(dictionary, "flash.transitAlert"),
    severityFault: t(dictionary, "flash.severityFault"),
    severitySevere: t(dictionary, "flash.severitySevere"),
    severityWarning: t(dictionary, "flash.severityWarning"),
    severityNotice: t(dictionary, "flash.severityNotice"),
    cause: t(dictionary, "flash.cause"),
    direction: t(dictionary, "flash.direction"),
    line: t(dictionary, "flash.line"),
    shuttle: t(dictionary, "flash.shuttle"),
  };
  const supportingStories = topStories;
  const hasBriefingContent = Boolean(
    briefing?.summary || briefing?.focusList.length || briefing?.watchList.length
  );
  const isEmpty = !notice && !topStories.length && !hasBriefingContent && !subwayAlerts.length;
  const pullToRefresh = usePullToRefresh({
    disabled: loading,
    onRefresh: refreshPage,
  });
  const { resetPull: resetPullToRefresh } = pullToRefresh;

  useLayoutEffect(() => {
    if (initialLoadSettledRef.current || loading) return;

    initialLoadSettledRef.current = true;
    resetPullToRefresh();
    void scrollAppToTop("auto");
  }, [loading, resetPullToRefresh]);

  return (
    <div className="px-4" {...pullToRefresh.touchHandlers}>
      {desktopRefreshing && data ? (
        <AppLoadingOverlay className="hidden md:flex" />
      ) : null}
      <DesktopHeader notice={notice} />
      <MobileHeader
        regionLabel={regionLabel}
        regionSettingsHref={localizePath(
          "/settings?panel=region",
          locale,
          hasLocalePrefix(pathname)
        )}
        regionLabelPrefix={dictionary.setting.region.title}
        webPushHref={localizePath("/web-push", locale, hasLocalePrefix(pathname))}
        webPushLabel={dictionary.webPushPage.title}
        notice={notice}
      />
      {pullToRefresh.shouldShowPullIndicator ? (
        <PullToRefreshIndicator state={pullToRefresh} />
      ) : null}

      {loading && !data ? (
        <AppLoadingOverlay />
      ) : failed || isEmpty ? (
        <AppCenteredState
          title={failed ? t(dictionary, "flash.empty.title") : t(dictionary, "flash.empty.noContentTitle")}
          description={failed ? t(dictionary, "flash.empty.description") : t(dictionary, "flash.empty.noContentDescription")}
          actionLabel={t(dictionary, "flash.empty.retry")}
          onAction={() => load(true)}
        />
      ) : (
        <PullToRefreshSurface
          key={`${currentCacheKey}:${contentRevision}`}
          className="mt-4 space-y-4 pb-[calc(var(--app-safe-tab-bottom))] md:mt-0 md:pb-0"
        >
          {briefing && (briefing.summary || briefing.focusList.length || briefing.watchList.length) ? (
            <FlashRevealCard delay={0}>
              <BriefingSection
                briefing={briefing}
                labels={labels}
                locale={locale}
              />
            </FlashRevealCard>
          ) : null}

          {subwayAlerts.length ? (
            <FlashRevealCard delay={90}>
              <SubwayAlertsSection
                alerts={subwayAlerts}
                lastUpdated={data?.transitStatus?.updatedAt ?? null}
                externalLink={data?.transitStatus?.externalLink ?? null}
                labels={labels}
                locale={locale}
              />
            </FlashRevealCard>
          ) : null}

          {supportingStories.length ? (
            <FlashRevealCard delay={180}>
              <section className="rounded-lg border bg-transparent backdrop-blur-xl">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <span className="grid size-7 place-items-center rounded-md bg-primary text-white">
                    <Newspaper className="size-4" />
                  </span>
                  <h2 className="font-semibold">{t(dictionary, "flash.topStory")}</h2>
                </div>
                <div className="divide-y p-3 md:p-4">
                  {supportingStories.map((item, index) => (
                    <StoryRow
                      key={item.id}
                      item={item}
                      locale={locale}
                      dictionary={dictionary}
                      isFirst={index === 0}
                      isLast={index === supportingStories.length - 1}
                    />
                  ))}
                </div>
              </section>
            </FlashRevealCard>
          ) : null}
        </PullToRefreshSurface>
      )}
    </div>
  );
}

function FlashRevealCard({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <div
      className="isolate backface-hidden contain-[paint] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-reduce:animate-none"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {children}
    </div>
  );
}

function storyHref(item: FlashNewsItemInfo, locale: Locale) {
  return newsDetailHref(item.id, locale);
}

function newsDetailHref(newsId: number, locale: Locale) {
  return localizePath(`/news/detail?id=${encodeURIComponent(String(newsId))}`, locale);
}

function topicLabel(topic: string, dictionary: Dictionary) {
  const topicKey = topic.trim().toLowerCase();
  const topicPath = {
    local: "local",
    "local life": "local",
    immigration: "immigration",
    education: "education",
    health: "health",
    entertainment: "entertainment",
    headline: "headline",
    headlines: "headline",
  }[topicKey] ?? "headline";
  return t(dictionary, `explore.tabs.${topicPath}`);
}

function StoryRow({
  item,
  locale,
  dictionary,
  isFirst,
  isLast,
}: {
  item: FlashNewsItemInfo;
  locale: Locale;
  dictionary: Dictionary;
  isFirst: boolean;
  isLast: boolean;
}) {
  const rowPadding = `${isFirst ? "pt-0" : "pt-3"} ${isLast ? "pb-0" : "pb-3"}`;

  return (
    <div className={rowPadding}>
      <article className="hidden items-start gap-3 md:flex">
        {item.imageUrl ? (
          <Link href={storyHref(item, locale)} prefetch={false} scroll={false} className="shrink-0">
            <Image
              unoptimized
              src={optimizeRemoteImageUrl(item.imageUrl, { width: 400, height: 300 })}
              alt=""
              width={176}
              height={132}
              className="h-33 w-44 rounded-md object-cover"
            />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 text-lg font-semibold leading-6">
              <Link href={storyHref(item, locale)} prefetch={false} scroll={false} className="hover:text-primary">
                {item.langTitle || item.title}
              </Link>
            </h3>
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-destructive/10 px-2.5 text-[11px] font-semibold text-destructive dark:bg-destructive/20">
              {topicLabel(item.topic, dictionary)}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground md:text-base">
            {item.langDescription || item.description}
          </p>
        </div>
      </article>
      <article className="flex flex-col items-start md:hidden">
        <Link href={storyHref(item, locale)} prefetch={false} scroll={false} className="block w-full">
          <div className="flex w-full items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-5">
              {item.langTitle || item.title}
            </h3>
            <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-destructive/10 px-2 text-[10px] font-semibold text-destructive dark:bg-destructive/20">
              {topicLabel(item.topic, dictionary)}
            </span>
          </div>
          <div className="flex items-start gap-1 pt-1">
            {item.imageUrl ? (
              <Image
                unoptimized
                src={optimizeRemoteImageUrl(item.imageUrl, { width: 240, height: 200 })}
                alt=""
                width={96}
                height={80}
                className="h-20 w-24 rounded-sm object-cover"
              />
            ) : null}
            <p className="line-clamp-4 flex-1 text-sm leading-5 text-muted-foreground">
              {item.langDescription || item.description}
            </p>
          </div>
        </Link>
      </article>
    </div>
  );
}

type FlashLabels = {
  briefing: string;
  focus: string;
  watch: string;
  expandDetails: string;
  collapseDetails: string;
  transit: string;
  severityFault: string;
  severitySevere: string;
  severityWarning: string;
  severityNotice: string;
  cause: string;
  direction: string;
  line: string;
  shuttle: string;
};

function SeverityBadge({
  severityOrder,
  labels,
}: {
  severityOrder: number | null;
  labels: FlashLabels;
}) {
  const severity = severityOrder === 1
    ? { label: labels.severityFault, Icon: OctagonX, className: "text-red-600 dark:text-red-400" }
    : severityOrder === 2
      ? { label: labels.severitySevere, Icon: Siren, className: "text-orange-600 dark:text-orange-400" }
      : severityOrder === 3
        ? { label: labels.severityWarning, Icon: AlertTriangle, className: "text-yellow-600 dark:text-yellow-400" }
        : { label: labels.severityNotice, Icon: CircleCheck, className: "text-green-600 dark:text-green-400" };

  const Icon = severity.Icon;
  return (
    <span
      title={severity.label}
      aria-label={severity.label}
      className={`inline-flex size-5 shrink-0 items-center justify-center ${severity.className}`}
    >
      <Icon className="size-4" strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

function BriefingSection({
  briefing,
  labels,
  locale,
}: {
  briefing: FlashBriefingInfo;
  labels: FlashLabels;
  locale: Locale;
}) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const hasDetails = briefing.focusList.length > 0 || briefing.watchList.length > 0;
  const DetailsIcon = isDetailsExpanded ? ListChevronsDownUp : ListChevronsUpDown;

  return (
    <section className="rounded-lg border bg-transparent backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-white">
            <Sparkles className="size-4" />
          </span>
          <h2 className="font-semibold">{labels.briefing}</h2>
        </div>
        {briefing.generatedAt ? (
          <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
          {formatTime12Hour(briefing.generatedAt, locale)}
          </span>
        ) : null}
      </div>

      <div className="p-3 md:p-4">
        {briefing.summary ? (
          <div className="rounded-xl bg-primary/5 px-4 py-3 text-base leading-7 md:text-lg">
            {briefing.summary}
          </div>
        ) : null}

        {hasDetails ? (
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={isDetailsExpanded}
            aria-controls="briefing-details"
            aria-label={isDetailsExpanded ? labels.collapseDetails : labels.expandDetails}
            onClick={() => setIsDetailsExpanded((expanded) => !expanded)}
          >
            <span className="h-px w-8 bg-border" aria-hidden="true" />
            <DetailsIcon className="size-4" aria-hidden="true" />
            <span>{isDetailsExpanded ? labels.collapseDetails : labels.expandDetails}</span>
            <DetailsIcon className="size-4" aria-hidden="true" />
            <span className="h-px w-8 bg-border" aria-hidden="true" />
          </button>
        ) : null}

        {isDetailsExpanded ? (
          <div id="briefing-details">
            {briefing.focusList.length ? (
              <BriefingGroup title={labels.focus} points={briefing.focusList} locale={locale} variant="focus" />
            ) : null}
            {briefing.watchList.length ? (
              <BriefingGroup title={labels.watch} points={briefing.watchList} locale={locale} variant="watch" />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BriefingGroup({
  title,
  points,
  locale,
  variant,
}: {
  title: string;
  points: FlashBriefingPointInfo[];
  locale: Locale;
  variant: "focus" | "watch";
}) {
  const groupStyle = {
    Icon: variant === "focus" ? Target : Eye,
    className:
      variant === "focus"
        ? "border bg-muted/30 text-amber-700 dark:text-amber-300"
        : "border bg-muted/30 text-sky-700 dark:text-sky-300",
  };
  const GroupIcon = groupStyle.Icon;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${groupStyle.className}`}>
          <GroupIcon className="size-3.5" />
          {title}
        </span>
      </h3>
      <div className="mt-3 space-y-2">
        {points.map((point, index) => (
          <BriefingPointCard key={`${point.title}-${index}`} point={point} index={index} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function BriefingPointCard({
  point,
  index,
  locale,
}: {
  point: FlashBriefingPointInfo;
  index: number;
  locale: Locale;
}) {
  const content = (
    <>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive dark:bg-destructive/20">
        {index + 1}
      </span>
      <div className="min-w-0">
        <h4 className="text-base font-semibold leading-snug md:text-lg">{point.title}</h4>
        <p className="mt-1 text-sm leading-5 text-muted-foreground md:text-base">{point.detail}</p>
      </div>
    </>
  );
  const className = "flex gap-3 rounded-xl border bg-muted/30 p-3 transition-colors hover:bg-muted/55";

  return point.newsId ? (
    <Link
      href={newsDetailHref(point.newsId, locale)}
      prefetch={false}
      scroll={false}
      className={className}
    >
      {content}
    </Link>
  ) : (
    <article className="flex gap-3 rounded-xl border bg-muted/30 p-3">{content}</article>
  );
}

function transitRouteClassName(route: string) {
  const routeNumber = route.match(/\d+/)?.[0] ?? route.trim();
  return {
    "1": "bg-[#f8c302] text-white",
    "2": "bg-[#00923f] text-white",
    "4": "bg-[#a21968] text-white",
    "5": "bg-[#eb8738] text-white",
    "6": "bg-[#969594] text-white",
  }[routeNumber] ?? "bg-primary text-white";
}

function SubwayAlertsSection({
  alerts,
  lastUpdated,
  externalLink,
  labels,
  locale,
}: {
  alerts: TransitAlertInfo[];
  lastUpdated: string | null;
  externalLink: string | null;
  labels: FlashLabels;
  locale: Locale;
}) {
  const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(() => new Set());

  const toggleAlert = (index: number) => {
    setExpandedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const headerContent = (
    <>
      <div className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-primary text-white">
          <TrainFront className="size-4" />
        </span>
        <h2 className="font-semibold">{labels.transit}</h2>
      </div>
      {lastUpdated ? (
        <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
          <Clock3 className="size-3.5" />
          {formatTime12Hour(lastUpdated, locale)}
        </span>
      ) : null}
    </>
  );

  return (
    <section className="rounded-lg border bg-transparent backdrop-blur-xl">
      {externalLink ? (
        <a
          href={externalLink}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 border-b px-3 py-2 transition-colors hover:bg-muted/35"
        >
          {headerContent}
        </a>
      ) : (
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          {headerContent}
        </div>
      )}
      <div className="p-3 md:p-4">
        {alerts.map((alert, index) => (
          <article
            key={`${alert.route}-${index}`}
            className={`${index === 0 ? "pt-0" : "border-t border-border pt-3"} ${index === alerts.length - 1 ? "pb-0" : "pb-3"}`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 py-0 text-left transition-colors hover:bg-muted/35"
              aria-expanded={expandedIndexes.has(index)}
              aria-controls={`subway-alert-${index}`}
              onClick={() => toggleAlert(index)}
            >
              <span className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-1 text-sm">
                <span className="inline-flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex h-6 w-18 items-center justify-center rounded-full px-3 text-base font-semibold leading-none md:h-7 md:w-20 md:text-lg ${transitRouteClassName(alert.route)}`}
                  >
                    {labels.line} {alert.route}
                  </span>
                  <SeverityBadge severityOrder={alert.severityOrder} labels={labels} />
                </span>
                {alert.status ? (
                  <span className="min-w-0 flex-[1_1_auto] wrap-break-word text-base font-semibold leading-snug text-foreground md:text-lg">
                    {alert.status}
                  </span>
                ) : null}
              </span>
              <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${expandedIndexes.has(index) ? "rotate-180" : ""}`} />
            </button>
            {expandedIndexes.has(index) ? (
              <div id={`subway-alert-${index}`} className="px-1 pb-3 pt-3 md:px-2">
                <p className="text-sm leading-5 text-muted-foreground md:text-base">{alert.message}</p>
                <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-xs">
                  {alert.cause ? (
                    <span
                      title={labels.cause}
                      aria-label={`${labels.cause}: ${alert.cause}`}
                      className="inline-flex items-center gap-1.5 text-foreground/80"
                    >
                      <Info className="size-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />
                      <span>{alert.cause}</span>
                    </span>
                  ) : null}
                  {alert.direction ? (
                    <span
                      title={labels.direction}
                      aria-label={`${labels.direction}: ${alert.direction}`}
                      className="inline-flex items-center gap-1.5 text-foreground/80"
                    >
                      <ArrowDownUp className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      <span>{alert.direction}</span>
                    </span>
                  ) : null}
                  {alert.fromStop || alert.toStop ? (
                    <span
                      title={labels.line}
                      aria-label={`${labels.line}: ${[alert.fromStop, alert.toStop].filter(Boolean).join(" → ")}`}
                      className="inline-flex items-center gap-1.5 text-foreground/80"
                    >
                      <Route className="size-3.5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                      <span>{[alert.fromStop, alert.toStop].filter(Boolean).join(" → ")}</span>
                    </span>
                  ) : null}
                  {alert.shuttle ? (
                    <span
                      title={labels.shuttle}
                      aria-label={`${labels.shuttle}: ${alert.shuttle}`}
                      className="inline-flex items-center gap-1.5 text-foreground/80"
                    >
                      <Bus className="size-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
                      <span>{alert.shuttle}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DesktopHeader({ notice }: { notice: string | undefined }) {
  return (
    <div className="hidden md:flex">
      <header className="inset-x-0 w-full space-y-2 bg-transparent py-4">
        {notice ? (
          <div className="rounded-lg border bg-transparent px-3 py-2 text-sm font-medium text-primary backdrop-blur-xl">
            {notice}
          </div>
        ) : null}
      </header>
    </div>
  );
}

function MobileHeader({
  regionLabel,
  regionSettingsHref,
  regionLabelPrefix,
  webPushHref,
  webPushLabel,
  notice,
}: {
  regionLabel: string;
  regionSettingsHref: string;
  regionLabelPrefix: string;
  webPushHref: string;
  webPushLabel: string;
  notice: string | undefined;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4 md:hidden">
      <AppMobileStickyHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 cursor-pointer items-center gap-2 text-left"
            aria-label={`${regionLabelPrefix}: ${regionLabel}`}
            onClick={() => router.push(regionSettingsHref)}
          >
            <MapPin strokeWidth={2.5} className="size-5 shrink-0 text-primary" />
            <h1 className="text-2xl font-bold text-primary">{regionLabel}</h1>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <WebPushLinkButton href={webPushHref} label={webPushLabel} />
            <AddToHomeScreenButton />
          </div>
        </div>
        {notice ? (
          <div className="rounded-lg border bg-transparent px-3 py-2 text-sm font-medium text-primary backdrop-blur-xl">
            {notice}
          </div>
        ) : null}
      </AppMobileStickyHeader>
      <AppMobileStickyHeaderSpacer height="calc(var(--app-safe-header-top) + 4.5rem)" />
    </div>
  );
}
