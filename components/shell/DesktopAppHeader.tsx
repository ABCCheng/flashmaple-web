"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  HelpCircle,
  Info,
  Languages,
  MapPin,
  MessageSquare,
  Palette,
  RefreshCw,
  Settings,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AppSearchForm } from "@/components/app";
import { WebPushLinkButton } from "@/features/web-push/WebPushLinkButton";
import { usePageRefreshContext } from "@/components/providers/page-refresh-provider";
import { useRegionContext } from "@/components/providers/region-provider";
import { homePath, type Dictionary, type Locale, localizePath } from "@/lib/i18n";
import { notifyAppScrollSnapshot } from "@/lib/app-scroll";
import { notifyExploreTabSelection } from "@/lib/explore-tab-events";
import { cn } from "@/lib/utils";
import { useDismissibleMenu } from "@/lib/use-dismissible-menu";
import { appZIndex } from "@/lib/z-index";

const headerMenuSurfaceClass =
  "absolute right-0 top-[calc(100%+0.5rem)] grid gap-0.5 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_46px_rgba(28,28,30,0.16)] backdrop-blur-xl";
const headerMenuItemClass =
  "flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-primary/10 hover:text-foreground [&_svg]:size-4 [&_svg]:text-primary";

type DesktopAppHeaderProps = {
  locale: Locale;
  keepLocalePrefix: boolean;
  dictionary: Dictionary;
  currentPath: string;
  activeExploreTab: string;
  isSearchResult: boolean;
  isLoggedIn: boolean;
  displayName: string;
  avatar: string | null;
};

export function DesktopAppHeader({
  locale,
  keepLocalePrefix,
  dictionary,
  currentPath,
  activeExploreTab,
  isSearchResult,
  isLoggedIn,
  displayName,
  avatar,
}: DesktopAppHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  useDismissibleMenu(helpOpen, helpMenuRef, setHelpOpen);
  useDismissibleMenu(settingsOpen, settingsMenuRef, setSettingsOpen);

  const { regionLabel } = useRegionContext();
  const { canRefresh, refreshing, refresh } = usePageRefreshContext();

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = searchQuery.trim();
    if (!keyword) return;
    router.push(localizePath(`/news?q=${encodeURIComponent(keyword)}`, locale, keepLocalePrefix));
  }

  const authHref = localizePath("/auth", locale, keepLocalePrefix);
  const profileHref = localizePath("/profile", locale, keepLocalePrefix);
  const privacyHref = localizePath("/about?panel=privacy", locale, keepLocalePrefix);
  const termsHref = localizePath("/about?panel=terms", locale, keepLocalePrefix);
  const aboutAppHref = localizePath("/about?panel=app", locale, keepLocalePrefix);
  const feedbackHref = localizePath("/about?panel=feedback", locale, keepLocalePrefix);
  const themeHref = localizePath("/settings?panel=theme", locale, keepLocalePrefix);
  const languageHref = localizePath("/settings?panel=language", locale, keepLocalePrefix);
  const regionHref = localizePath("/settings?panel=region", locale, keepLocalePrefix);
  const voiceHref = localizePath("/settings?panel=voice", locale, keepLocalePrefix);
  const homeHref = localizePath("/", locale, keepLocalePrefix);
  const publicHomeHref = homePath("/", locale);
  const favoritesHref = localizePath("/favorites", locale, keepLocalePrefix);

  const primaryTabs = [
    { href: homeHref, label: dictionary.tabs.flash, active: currentPath === "/" },
    {
      href: favoritesHref,
      label: dictionary.tabs.favorites,
      active: currentPath.startsWith("/favorites"),
    },
  ];

  const exploreTabs = [
    "local",
    "immigration",
    "education",
    "health",
    "entertainment",
    "headline",
  ].map((key) => ({
    href: localizePath(`/news?tab=${key}`, locale, keepLocalePrefix),
    exploreTabKey: key,
    label: dictionary.explore.tabs[key as keyof typeof dictionary.explore.tabs],
    active: currentPath === "/news" && !isSearchResult && activeExploreTab === key,
  }));

  return (
    <header className={cn("sticky top-0 hidden shrink-0 bg-transparent md:block md:h-(--app-desktop-header-height)", appZIndex.navigation)}>
      <div className="mx-auto flex h-full w-[min(100%,1200px)] flex-col gap-1 px-4 pt-[1.35rem] lg:px-6">
        <div className="grid h-10 w-full grid-cols-[minmax(max-content,1fr)_minmax(10rem,40rem)_minmax(max-content,1fr)] items-center gap-x-3 lg:gap-x-4">
          <div className="inline-flex h-10 min-w-max w-fit items-center gap-2.5 text-lg font-bold text-foreground no-underline" aria-label={`FlashMaple ${regionLabel}`}>
            <Link href={publicHomeHref} className="grid size-10 place-items-center rounded-lg bg-[#d3001c]">
              <Image unoptimized src="/logo.svg" width={40} height={40} className="size-10" alt="FlashMaple" />
            </Link>
            <div className="flex h-10 min-w-max flex-col justify-center">
              <span className="leading-5 text-[#d3001c] dark:text-white">FlashMaple</span>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-1 text-left text-sm leading-4 text-muted-foreground"
                aria-label={`${dictionary.setting.region.title}: ${regionLabel}`}
                onClick={() => router.push(regionHref)}
              >
                <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2.5}/>
                <span>{regionLabel}</span>
              </button>
            </div>
          </div>

          <AppSearchForm
            formClassName="h-10 justify-self-center"
            inputClassName="h-10"
            showLeadingIcon={false}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder={dictionary.explore.search.placeholder}
            onSubmit={handleSearch}
          />

          <div className="flex min-w-max items-center justify-end gap-1 lg:gap-2">
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className={cn("text-primary cursor-pointer", !canRefresh && "cursor-default")}
              aria-label="Refresh current page"
              disabled={!canRefresh || refreshing}
              onClick={refresh}
            >
              <RefreshCw className={refreshing ? "animate-spin" : ""} />
            </Button>
            <div className="relative" ref={helpMenuRef}>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="text-primary cursor-pointer"
                aria-label="About us"
                aria-expanded={helpOpen}
                onClick={() => {
                  setHelpOpen((value) => !value);
                  setSettingsOpen(false);
                }}
              >
                <HelpCircle />
              </Button>
              {helpOpen ? (
                <HelpMenu
                  privacyHref={privacyHref}
                  termsHref={termsHref}
                  aboutAppHref={aboutAppHref}
                  feedbackHref={feedbackHref}
                  dictionary={dictionary}
                  onNavigate={() => setHelpOpen(false)}
                />
              ) : null}
            </div>
            <div className="relative" ref={settingsMenuRef}>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="text-primary cursor-pointer"
                aria-label="Settings"
                aria-expanded={settingsOpen}
                onClick={() => {
                  setSettingsOpen((value) => !value);
                  setHelpOpen(false);
                }}
              >
                <Settings />
              </Button>
              {settingsOpen ? (
                <SettingsMenu
                  themeHref={themeHref}
                  languageHref={languageHref}
                  regionHref={regionHref}
                  voiceHref={voiceHref}
                  dictionary={dictionary}
                  onNavigate={() => setSettingsOpen(false)}
                />
              ) : null}
            </div>
            <WebPushLinkButton
              href={localizePath("/web-push", locale, keepLocalePrefix)}
              label={dictionary.webPushPage.title}
            />
            {isLoggedIn ? (
              <Button asChild variant="destructive" className="h-10 rounded-full px-2">
                <Link href={profileHref} aria-label="Profile">
                  <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {avatar ? (
                      <Image
                        unoptimized
                        src={avatar}
                        alt=""
                        width={28}
                        height={28}
                        loading="eager"
                        className="size-full object-cover"
                      />
                    ) : (
                      (displayName || "U").slice(0, 1).toUpperCase()
                    )}
                  </span>
                </Link>
              </Button>
            ) : (
              <Button asChild className="h-10 rounded-full px-4">
                <Link href={authHref}>{dictionary.profile.login}</Link>
              </Button>
            )}
          </div>
        </div>

        <DesktopTabs primaryTabs={primaryTabs} exploreTabs={exploreTabs} />
      </div>
    </header>
  );
}

function DesktopTabs({
  primaryTabs,
  exploreTabs,
}: {
  primaryTabs: Array<{ href: string; label: string; active: boolean }>;
  exploreTabs: Array<{ href: string; label: string; active: boolean; exploreTabKey: string }>;
}) {
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const allTabs = [...primaryTabs, ...exploreTabs];
  const activeTab = allTabs.find((tab) => tab.active);
  const activeTabHref = activeTab?.href;

  useEffect(() => {
    if (!activeTabHref) return;
    tabRefs.current[activeTabHref]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTabHref]);

  return (
    <nav
      className="mx-auto w-full overflow-x-auto overflow-y-hidden overscroll-x-contain"
      aria-label="Desktop primary"
    >
      <div className="mx-auto flex w-max min-w-full items-center justify-center gap-4 px-1 lg:gap-6">
        <div className="inline-flex min-w-max items-center gap-4 lg:gap-6">
          {primaryTabs.map((tab) => (
            <DesktopTab
              key={tab.href}
              {...tab}
              refCallback={(node) => {
                tabRefs.current[tab.href] = node;
              }}
            />
          ))}
        </div>
        <span
          className="inline-flex min-w-max items-center self-stretch pb-3 pt-2 text-[0.9375rem] font-semibold leading-none text-muted-foreground"
          aria-hidden="true"
        >
          |
        </span>
        <div className="inline-flex min-w-max items-center gap-4 lg:gap-6">
          {exploreTabs.map((tab) => (
            <DesktopTab
              key={tab.href}
              {...tab}
              refCallback={(node) => {
                tabRefs.current[tab.href] = node;
              }}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function DesktopTab({
  href,
  label,
  active,
  exploreTabKey,
  refCallback,
}: {
  href: string;
  label: string;
  active: boolean;
  exploreTabKey?: string;
  refCallback: (node: HTMLAnchorElement | null) => void;
}) {
  return (
    <Link
      ref={refCallback}
      href={href}
      scroll={false}
      onNavigate={() => {
        notifyAppScrollSnapshot({ deactivate: !exploreTabKey });
        if (exploreTabKey) {
          notifyExploreTabSelection(exploreTabKey);
        }
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative min-w-max whitespace-nowrap pb-3 pt-2 text-center text-[0.9375rem] font-semibold leading-none text-muted-foreground no-underline transition-colors hover:text-primary",
        active && "text-primary"
      )}
    >
      <span
        className={cn(
          "relative inline-block after:absolute after:inset-x-0 after:-bottom-3 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition after:content-[''] group-hover:after:scale-x-100",
          active ? "after:scale-x-100 after:opacity-100" : "after:scale-x-40"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function HelpMenu({
  privacyHref,
  termsHref,
  aboutAppHref,
  feedbackHref,
  dictionary,
  onNavigate,
}: {
  privacyHref: string;
  termsHref: string;
  aboutAppHref: string;
  feedbackHref: string;
  dictionary: Dictionary;
  onNavigate: () => void;
}) {
  return (
    <div className={cn(headerMenuSurfaceClass, "min-w-54", appZIndex.menu)}>
      <Link className={headerMenuItemClass} href={aboutAppHref} onClick={onNavigate}>
        <Info />
        {dictionary.profile.menu.aboutApp}
      </Link>
      <Link className={headerMenuItemClass} href={privacyHref} onClick={onNavigate}>
        <ShieldCheck />
        {dictionary.profile.menu.privacy}
      </Link>
      <Link className={headerMenuItemClass} href={termsHref} onClick={onNavigate}>
        <FileText />
        {dictionary.profile.menu.terms}
      </Link>
      <Link className={headerMenuItemClass} href={feedbackHref} onClick={onNavigate}>
        <MessageSquare />
        {dictionary.profile.menu.feedback}
      </Link>
    </div>
  );
}

function SettingsMenu({
  themeHref,
  languageHref,
  regionHref,
  voiceHref,
  dictionary,
  onNavigate,
}: {
  themeHref: string;
  languageHref: string;
  regionHref: string;
  voiceHref: string;
  dictionary: Dictionary;
  onNavigate: () => void;
}) {
  return (
    <div className={cn(headerMenuSurfaceClass, "min-w-54", appZIndex.menu)}>
      <Link className={headerMenuItemClass} href={themeHref} onClick={onNavigate}>
        <Palette />
        {dictionary.profile.menu.theme}
      </Link>
      <Link className={headerMenuItemClass} href={regionHref} onClick={onNavigate}>
        <MapPin />
        {dictionary.profile.menu.region}
      </Link>
      <Link className={headerMenuItemClass} href={languageHref} onClick={onNavigate}>
        <Languages />
        {dictionary.profile.menu.language}
      </Link>
      <Link className={headerMenuItemClass} href={voiceHref} onClick={onNavigate}>
        <Volume2 />
        {dictionary.profile.menu.voice}
      </Link>
    </div>
  );
}
