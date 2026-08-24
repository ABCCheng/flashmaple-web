"use client";

import { useCallback, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ChevronLeft, Zap, Compass, Star, UserRound, type LucideIcon } from "lucide-react";
import { Slot } from "radix-ui";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dictionaries,
  getLocaleFromPathname,
  hasLocalePrefix,
  localizePath,
  stripLocaleFromPathname,
} from "@/lib/i18n";
import { canGoBackInApp } from "@/lib/stores/app-session";
import { notifyAppScrollSnapshot } from "@/lib/app-scroll";
import { AppMobileStickyHeaderSpacer } from "./AppChrome";
import { appZIndex } from "@/lib/z-index";


export function useRouterBack(fallbackHref = "/") {
  const router = useRouter();
  const path = usePathname();
  const locale = getLocaleFromPathname(path);
  const keepLocalePrefix = hasLocalePrefix(path);

  return useCallback(() => {
    if (canGoBackInApp()) {
      router.back();
    } else {
      router.push(localizePath(fallbackHref, locale, keepLocalePrefix));
    }
  }, [fallbackHref, keepLocalePrefix, locale, router]);
}

type TabLabelKey = Exclude<
  keyof (typeof dictionaries)["en"]["tabs"],
  never
>;

const tabs = [
  { href: "/", labelKey: "flash", icon: Zap },
  { href: "/news", labelKey: "explore", icon: Compass },
  { href: "/favorites", labelKey: "favorites", icon: Star },
  { href: "/profile", labelKey: "profile", icon: UserRound },
] satisfies Array<{
  href: string;
  labelKey: TabLabelKey;
  icon: LucideIcon;
}>;

export function AppMobileBottomTab() {
  const path = usePathname();
  const locale = getLocaleFromPathname(path);
  const keepLocalePrefix = hasLocalePrefix(path);
  const currentPath = stripLocaleFromPathname(path);
  const tabsDict = dictionaries[locale].tabs;

  return (
    <AppMobileBottomTabBar>
        {tabs.map((t) => {
          const Icon = t.icon;
          const label = tabsDict[t.labelKey];
          const href = localizePath(t.href, locale, keepLocalePrefix);
          const active =
            currentPath === t.href ||
            (t.href !== "/" && currentPath.startsWith(t.href));

          return (
            <AppMobileBottomTabButton
              key={t.href}
              asChild
              active={active}
              icon={Icon}
              label={label}
            >
              <Link
                href={href}
                scroll={false}
                aria-label={label}
                onClick={() => notifyAppScrollSnapshot(active ? {} : { deactivate: true })}
                aria-current={active ? "page" : undefined}
              >
                <AppMobileBottomTabContent active={active} icon={Icon} label={label} />
              </Link>
            </AppMobileBottomTabButton>
          );
        })}
    </AppMobileBottomTabBar>
  );
}

export function AppMobileBackHeader({
  className,
  iconUrl, 
  title,
  actions,
  ...props
}: ComponentPropsWithoutRef<"header"> & {
  iconUrl?: string;
  title:string;
  actions?: ReactNode;
}) {
  const routerBack = useRouterBack();

  return (
    <>
      <header data-slot="app-mobile-back-header" className={cn("app-mobile-chrome fixed inset-x-0 top-0 flex w-full items-center justify-between px-3 pb-1 pt-(--app-safe-header-top) md:hidden", appZIndex.navigation, className)}
        {...props}
      >
        <div className="flex items-center">
          <Button type="button" size="icon-normal" variant="destructive" aria-label="BackHeader" className="text-primary mr-3" onClick={routerBack}>
            <ChevronLeft />
          </Button>
          {iconUrl && (
            <Image
              unoptimized
              src={iconUrl}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-full mr-1"
            />
          )}
          <div className="text-lg">{title}</div>
        </div>

        <div className="flex items-center gap-3 [&_svg]:cursor-pointer [&_svg]:text-primary">
          {actions}
        </div>
      </header>
      <AppMobileStickyHeaderSpacer height="calc(var(--app-safe-header-top) + 2rem)" />
    </>
  );
}

function AppMobileBottomTabBar({
  className,
  children,
  ariaLabel = "Primary",
  ...props
}: ComponentPropsWithoutRef<"nav"> & {
  ariaLabel?: string;
}) {
  return (
    <nav
      data-slot="app-mobile-bottom-tab-bar"
      aria-label={ariaLabel}
      className={cn(
        "app-bottom-chrome pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-4 pb-(--app-safe-footer-bottom) pt-3 md:hidden",
        appZIndex.floatingAction,
        className
      )}
      {...props}
    >
      <div className="pointer-events-auto flex h-(--app-tab-height) w-[min(22.5rem,calc(100%-2rem))] items-center justify-between rounded-[2rem] border border-white/60 bg-white/72 px-2 shadow-[0_18px_46px_rgba(28,28,30,0.16)] backdrop-blur-2xl supports-backdrop-filter:bg-white/58 dark:border-white/10 dark:bg-[rgba(28,27,31,0.72)] dark:shadow-[0_18px_46px_rgba(0,0,0,0.42)] dark:supports-backdrop-filter:bg-[rgba(28,27,31,0.58)]">
        {children}
      </div>
    </nav>
  );
}

function AppMobileBottomTabButton({
  className,
  active,
  icon: Icon,
  label,
  asChild = false,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & {
  active?: boolean;
  asChild?: boolean;
  icon: LucideIcon;
  label: ReactNode;
}) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="app-mobile-bottom-tab-button"
      data-active={active ? "" : undefined}
      className={cn(
        "group relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.5rem] text-[0.6875rem] font-medium leading-none text-muted-foreground transition duration-200 ease-out",
        "hover:bg-background/70 hover:text-foreground active:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active && "bg-primary text-(--button-foreground) shadow-[0_10px_24px_rgba(211,0,28,0.24)] hover:bg-primary hover:text-primary-foreground",
        className
      )}
      {...props}
    >
      {children ?? <AppMobileBottomTabContent active={active} icon={Icon} label={label} />}
    </Comp>
  );
}

function AppMobileBottomTabContent({
  active,
  icon: Icon,
  label,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: ReactNode;
}) {
  return (
    <>
      <Icon
        aria-hidden="true"
        className={cn(
          "size-5 shrink-0 transition-transform duration-200",
          active ? "stroke-[2.45]" : "group-hover:-translate-y-0.5"
        )}
      />
      <span className="max-w-full truncate">{label}</span>
    </>
  );
}
