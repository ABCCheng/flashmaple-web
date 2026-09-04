"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Dot, FileText, Globe2, Languages, LogOut, MessageSquare, Palette, ShieldCheck, UserRound, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";

import { AppLoadingOverlay, AppModal } from "@/components/app";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { usePageRefreshHandler } from "@/components/providers/page-refresh-provider";
import { Button } from "@/components/ui/button";
import { getProfile, logout } from "@/lib/api/user";
import { localizePath } from "@/lib/i18n";
import { providerLabel } from "@/lib/oauth";
import { subscribeAuthStateChanged } from "@/lib/stores/auth-user";
import { clearUserInfo, getUserInfo, hasAuthHint, isAuthenticated, saveUserInfo, type LocalUserInfo } from "@/lib/stores/auth-user";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ProfilePage() {
  const { dictionary, locale } = useLocaleContext();
  const [user, setUser] = useState<LocalUserInfo | null>(null);
  const isLoggedIn = useSyncExternalStore(
    subscribeAuthStateChanged,
    isAuthenticated,
    () => false,
  );
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const syncLocalAuthState = useCallback(() => {
    const localUser = getUserInfo();
    const loggedIn = isAuthenticated();
    setUser(loggedIn ? localUser : null);
    return loggedIn;
  }, []);

  const refresh = useCallback(async () => {
    if (!hasAuthHint()) {
      clearUserInfo();
      syncLocalAuthState();
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile({ silent: true });

      if (profile?.code === 200 && profile.data) {
        saveUserInfo(profile.data);
        setUser(profile.data);
      } else {
        syncLocalAuthState();
      }

    } finally {
      setLoading(false);
    }
  }, [syncLocalAuthState]);

  useIsomorphicLayoutEffect(() => {
    syncLocalAuthState();
  }, [syncLocalAuthState]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeAuthStateChanged(syncLocalAuthState);
    return () => {
      window.clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [refresh, syncLocalAuthState]);

  usePageRefreshHandler(refresh);

  async function handleLogout() {
    setShowLogoutConfirmation(false);
    setLoading(true);
    try {
      await logout();
    } finally {
      clearUserInfo();
      setUser(null);
      setLoading(false);
    }
  }

  const displayName = user?.userName?.trim() || "Guest";
  const status = isLoggedIn
    ? dictionary.profile.statusLoggedIn.replace("{{provider}}", providerLabel(user?.identityType, dictionary))
    : dictionary.profile.statusLoggedOut;
  return (
    <>
      <div className="fixed inset-x-0 mx-auto w-[min(100%,40rem)] space-y-4 p-4 pt-(--app-safe-header-top)">
        <section className="flex items-center gap-3 rounded-lg border bg-card/50 p-4 shadow-sm">
          <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 text-4xl font-bold text-primary">
            {user?.avatar && user.avatarType === "IMAGE_URL" ? (
              <Image
                unoptimized
                src={user.avatar}
                alt=""
                width={56}
                height={56}
                loading="eager"
                className="size-full object-cover"
              />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
          {isLoggedIn ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="size-10 text-primary"
              aria-label={dictionary.profile.logout}
              onClick={() => setShowLogoutConfirmation(true)}
            >
              <LogOut />
            </Button>
          ) : (
            <Button asChild>
              <Link href={localizePath("/auth", locale)}>{dictionary.profile.login}</Link>
            </Button>
          )}
        </section>

        <MenuSection title={dictionary.profile.sections.setting}>
          <MenuItem href="/settings?panel=theme" icon={<Palette />} label={dictionary.profile.menu.theme} />
          <MenuItem href="/settings?panel=region" icon={<Globe2 />} label={dictionary.profile.menu.region} />
          <MenuItem href="/settings?panel=language" icon={<Languages />} label={dictionary.profile.menu.language} />
          <MenuItem href="/settings?panel=voice" icon={<Volume2 />} label={dictionary.profile.menu.voice || "Voice"} />
        </MenuSection>

        <MenuSection title={dictionary.profile.sections.about}>
          <MenuItem href="/about?panel=app" icon={<UserRound />} label={dictionary.profile.menu.aboutApp} />
          <MenuItem href="/about?panel=privacy" icon={<ShieldCheck />} label={dictionary.profile.menu.privacy} />
          <MenuItem href="/about?panel=terms" icon={<FileText />} label={dictionary.profile.menu.terms} />
          <MenuItem href="/about?panel=feedback" icon={<MessageSquare />} label={dictionary.profile.menu.feedback} />
        </MenuSection>
        <footer className={cn("pointer-events-none fixed inset-x-0 bottom-[calc(var(--app-safe-tab-bottom)+0.5rem)] text-center text-sm text-muted-foreground md:bottom-8", appZIndex.navigation)}>
          <span className="inline-flex items-center">
            © 2026 EffortGo
            <Dot aria-hidden="true" className="size-4" />
            {process.env.APP_VERSION}
          </span>
        </footer>
      </div>
      <AppModal
        open={showLogoutConfirmation}
        onOpenChange={setShowLogoutConfirmation}
        title={dictionary.profile.logoutConfirmTitle}
        description={dictionary.profile.logoutConfirmDescription}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLogoutConfirmation(false)}
            >
              {dictionary.confirm.no}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleLogout()}>
              {dictionary.confirm.yes}
            </Button>
          </>
        }
      />
      {loading && isLoggedIn ? <AppLoadingOverlay /> : null}
    </>
  );
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b pb-4 last-of-type:border-b-0">
      <h2 className="px-1 pb-2 text-md font-semibold text-muted-foreground">{title}</h2>
      <div className="overflow-hidden rounded-lg  bg-transparent">{children}</div>
    </section>
  );
}

function MenuItem({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const { locale } = useLocaleContext();
  return (
    <Link
      href={localizePath(href, locale)}
      scroll={false}
      className="flex items-center gap-3 px-3 py-3"
    >
      <span className="text-primary [&_svg]:size-5">{icon}</span>
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-muted-foreground"><ChevronRight /></span>
    </Link>
  );
}
