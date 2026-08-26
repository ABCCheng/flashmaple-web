"use client";

import { Bell, BrushCleaning, Circle, CircleCheck, ListCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppCenteredState, AppLoadingOverlay, AppMobileBackHeader, AppModal } from "@/components/app";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { appZIndex } from "@/lib/z-index";
import { hasLocalePrefix, localizePath } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/time";
import {
  subscribeWebPush,
  unsubscribeWebPush,
  type WebPushConfig,
  type WebPushSubscriptionPayload,
} from "@/lib/api/web-push";
import {
  cacheWebPushConfig,
  getCachedWebPushConfig,
  getCurrentWebPushSubscription,
  getServiceWorkerContainer,
  getWebPushPermission,
  loadWebPushConfig,
  isWebPushSupported,
  requestWebPushPermission,
  serializeWebPushSubscription,
} from "@/lib/web-push-client";
import {
  clearWebPushMessages,
  deleteWebPushMessage,
  getCachedWebPushMessages,
  getWebPushMessages,
  markAllWebPushMessagesRead,
  markWebPushMessageRead,
  subscribeWebPushMessageChanges,
  type WebPushMessage,
} from "@/lib/stores/web-push-messages";

const messageRevealClassName =
  "isolate [backface-visibility:hidden] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-reduce:animate-none";

export function WebPushPage() {
  const { dictionary, locale } = useLocaleContext();
  const pathname = usePathname();
  const router = useRouter();
  const [config, setConfig] = useState<WebPushConfig | null>(() => getCachedWebPushConfig());
  const [messages, setMessages] = useState<WebPushMessage[]>(() => getCachedWebPushMessages());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => Boolean(getCachedWebPushConfig()?.subscribed));
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(() => !getCachedWebPushConfig());
  const [saving, setSaving] = useState(false);
  const [showUnsubscribeConfirmation, setShowUnsubscribeConfirmation] = useState(false);
  const [showClearMessagesConfirmation, setShowClearMessagesConfirmation] = useState(false);
  const [showMarkAllReadConfirmation, setShowMarkAllReadConfirmation] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isWebPushSupported()) {
        setLoading(false);
        return;
      }

      const nextConfig = await loadWebPushConfig();
      if (cancelled) return;

      if (nextConfig) {
        cacheWebPushConfig(nextConfig);
        setConfig(nextConfig);
        setNotificationsEnabled(nextConfig.subscribed);
        setLoading(false);
      }

      try {
        const currentSubscription = await getCurrentWebPushSubscription();
        if (!cancelled) {
          setSubscription(currentSubscription);
          setNotificationsEnabled(Boolean(nextConfig?.subscribed && currentSubscription));
        }
      } catch {
        // Treat an unavailable local subscription as unsubscribed.
        if (!cancelled) setNotificationsEnabled(false);
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncMessagesFromStore = () => {
      if (!cancelled) setMessages(getCachedWebPushMessages());
    };

    const loadMessages = () => {
      void getWebPushMessages();
    };

    const unsubscribeMessages = subscribeWebPushMessageChanges(syncMessagesFromStore);
    loadMessages();

    return () => {
      cancelled = true;
      unsubscribeMessages();
    };
  }, []);

  useEffect(() => {
    const serviceWorker = getServiceWorkerContainer();
    if (!serviceWorker) return;

    void serviceWorker.ready.then((registration) => {
      registration.active?.postMessage({ type: "flashmaple:clear-push-notifications" });
    });
  }, []);

  async function getOrCreateSubscription() {
    const serviceWorker = getServiceWorkerContainer();
    if (!serviceWorker || !isWebPushSupported()) return null;

    const registration = await serviceWorker.ready;
    const existing = subscription ?? await registration.pushManager.getSubscription();
    if (existing) return { subscription: existing, created: false };

    if (!config?.publicKey) return null;
    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidPublicKey(config.publicKey),
    });
    return { subscription: created, created: true };
  }

  async function saveSubscription() {
    if (!config || saving) return false;

    setSaving(true);
    try {
      const permission = await requestWebPushPermission();
      if (permission === "unsupported") {
        showGlobalSnackbar(dictionary.webPushPage.unsupported);
        return false;
      }
      if (permission !== "granted") {
        showGlobalSnackbar(dictionary.webPushPage.browserPermissionBlocked);
        return false;
      }

      let result: Awaited<ReturnType<typeof getOrCreateSubscription>>;
      try {
        result = await getOrCreateSubscription();
      } catch {
        showGlobalSnackbar(
          getWebPushPermission() === "granted"
            ? dictionary.webPushPage.systemPermissionBlocked
            : dictionary.webPushPage.browserPermissionBlocked
        );
        return false;
      }

      if (!result) {
        showGlobalSnackbar(dictionary.webPushPage.unsupported);
        return false;
      }

      let payload: WebPushSubscriptionPayload | null;
      try {
        payload = serializeWebPushSubscription(result.subscription);
      } catch {
        showGlobalSnackbar(dictionary.webPushPage.failed);
        return false;
      }

      if (!payload) {
        showGlobalSnackbar(dictionary.webPushPage.failed);
        return false;
      }

      const response = await subscribeWebPush(payload);
      if (response?.code !== 200) {
        if (result.created) {
          try {
            await result.subscription.unsubscribe();
          } catch {
            // Best-effort cleanup after the server request has failed.
          }
        }
        return false;
      }

      setSubscription(result.subscription);
      updateConfig({ ...config, subscribed: true });
      setNotificationsEnabled(true);
      showGlobalSnackbar(dictionary.webPushPage.subscribedSuccess);
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubscribe() {
    if (!config?.subscribed || saving) return false;

    setSaving(true);
    try {
      let currentSubscription: PushSubscription | null = null;
      try {
        const serviceWorker = getServiceWorkerContainer();
        currentSubscription = subscription ?? (
          serviceWorker && isWebPushSupported()
            ? await (await serviceWorker.ready).pushManager.getSubscription()
            : null
        );
      } catch {
        showGlobalSnackbar(dictionary.webPushPage.failed);
        return false;
      }

      const response = await unsubscribeWebPush();
      if (response?.code !== 200) return false;

      try {
        if (currentSubscription) await currentSubscription.unsubscribe();
      } catch {
        showGlobalSnackbar(dictionary.webPushPage.failed);
        return false;
      }

      setSubscription(null);
      updateConfig({ ...config, subscribed: false });
      setNotificationsEnabled(false);
      showGlobalSnackbar(dictionary.webPushPage.unsubscribed);
      return true;
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(nextConfig: WebPushConfig) {
    cacheWebPushConfig(nextConfig);
    setConfig(nextConfig);
  }

  async function handleToggle(nextEnabled: boolean) {
    if (saving || nextEnabled === notificationsEnabled) return;

    if (!nextEnabled) {
      setShowUnsubscribeConfirmation(true);
      return;
    }

    const previousEnabled = notificationsEnabled;
    setNotificationsEnabled(nextEnabled);
    const succeeded = await saveSubscription();

    if (!succeeded) setNotificationsEnabled(previousEnabled);
  }

  async function confirmUnsubscribe() {
    setShowUnsubscribeConfirmation(false);
    await handleUnsubscribe();
  }

  async function openMessage(message: WebPushMessage) {
    if (!message.read) {
      try {
        setMessages(await markWebPushMessageRead(message.id));
      } catch {
        // Navigation should still work when local message storage is unavailable.
      }
    }

    router.push(localizePath(
      `/news/detail?id=${encodeURIComponent(message.newsId)}&source=notification`,
      locale,
      hasLocalePrefix(pathname)
    ));
  }

  async function removeMessage(messageId: string) {
    try {
      setMessages(await deleteWebPushMessage(messageId));
    } catch {
      // Keep the current list when local message storage is unavailable.
    }
  }

  async function confirmClearMessages() {
    setShowClearMessagesConfirmation(false);
    try {
      setMessages(await clearWebPushMessages());
    } catch {
      // Keep the current list when local message storage is unavailable.
    }
  }

  async function confirmMarkAllRead() {
    setShowMarkAllReadConfirmation(false);
    try {
      setMessages(await markAllWebPushMessagesRead());
    } catch {
      // Keep the current list when local message storage is unavailable.
    }
  }

  function renderMessageActions(compactSwitch = false) {
    return (
      <>
        {messages.length ? (
          <Button
            variant="destructive"
            aria-label={dictionary.webPushPage.clearAll}
            onClick={() => setShowClearMessagesConfirmation(true)}
          >
            <BrushCleaning />
          </Button>
        ) : null}
        {messages.some((message) => !message.read) ? (
          <Button
            variant="destructive"
            aria-label={dictionary.webPushPage.markAllRead}
            onClick={() => setShowMarkAllReadConfirmation(true)}
          >
            <ListCheck />
          </Button>
        ) : null}
        <Switch
          className={compactSwitch
            ? "h-6 w-10 **:data-[slot=switch-thumb]:size-4 **:data-[slot=switch-thumb]:data-[state=checked]:translate-x-5"
            : undefined}
          checked={notificationsEnabled}
          disabled={saving}
          aria-label={dictionary.webPushPage.title}
          onCheckedChange={(checked) => void handleToggle(checked)}
        />
      </>
    );
  }

  if (loading) return <AppLoadingOverlay />;
  if (!isWebPushSupported()) return null;

  return (
    <>
      <AppMobileBackHeader
        title={dictionary.webPushPage.title}
        actions={renderMessageActions(true)}
      />
      <article className="min-h-[calc(var(--app-viewport-height)-var(--app-safe-tab-bottom))] w-full px-4 pb-4 md:min-h-0 md:mx-auto md:w-[min(100%,40rem)]">
        <header className={cn("relative hidden items-center gap-2.5 py-4 md:flex [&>svg]:size-2xl [&>svg]:text-primary", appZIndex.contentControl)}>
          <Bell />
          <h1 className="text-2xl font-bold">{dictionary.webPushPage.title}</h1>
          <div className="ml-auto flex items-center gap-2 [&_svg]:cursor-pointer [&_svg]:text-primary">
            {renderMessageActions()}
          </div>
        </header>
        {messages.length ? (
          <div className="space-y-3 pt-4 md:pt-0">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    messageRevealClassName,
                    "cursor-pointer rounded-xl border bg-card/70 p-3 shadow-sm transition-colors hover:bg-card",
                    !message.read && "border-primary/40 bg-primary/5"
                  )}
                  style={{
                    animationDelay: `${Math.min(index, 5) * 45}ms`,
                    animationFillMode: "both",
                  }}
                  onClick={() => void openMessage(message)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void openMessage(message);
                    }
                  }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {message.read ? (
                      <CircleCheck className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <Circle className="size-4 shrink-0 text-primary" />
                    )}
                    <h2 className={cn("min-w-0 flex-1 truncate", !message.read && "font-semibold")}>
                      {message.title}
                    </h2>
                    <time
                      className="shrink-0 text-xs text-muted-foreground"
                      dateTime={message.receivedAt}
                    >
                      {formatRelativeTime(message.receivedAt, dictionary)}
                    </time>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="size-4 cursor-pointer md:size-8"
                      aria-label={dictionary.webPushPage.delete}
                      onClick={(event) => {
                        event.stopPropagation();
                        void removeMessage(message.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mb-(--app-safe-tab-bottom) flex min-h-12 w-full items-center justify-center py-2 text-sm leading-5 text-muted-foreground md:mb-0">
              {dictionary.webPushPage.latestMessagesOnly}
            </div>
          </div>
        ) : (
          <AppCenteredState muted>
            {dictionary.webPushPage.empty}
          </AppCenteredState>
        )}
      </article>
      <AppModal
        open={showUnsubscribeConfirmation}
        onOpenChange={setShowUnsubscribeConfirmation}
        title={dictionary.webPushPage.unsubscribeConfirmTitle}
        description={dictionary.webPushPage.unsubscribeConfirmDescription}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUnsubscribeConfirmation(false)}
            >
              {dictionary.confirm.no}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmUnsubscribe()}
            >
              {dictionary.confirm.yes}
            </Button>
          </>
        }
      />
      <AppModal
        open={showClearMessagesConfirmation}
        onOpenChange={setShowClearMessagesConfirmation}
        title={dictionary.webPushPage.clearAll}
        description={dictionary.webPushPage.clearAllDescription}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowClearMessagesConfirmation(false)}
            >
              {dictionary.confirm.no}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmClearMessages()}>
              {dictionary.confirm.yes}
            </Button>
          </>
        }
      />
      <AppModal
        open={showMarkAllReadConfirmation}
        onOpenChange={setShowMarkAllReadConfirmation}
        title={dictionary.webPushPage.markAllRead}
        description={dictionary.webPushPage.markAllReadDescription}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMarkAllReadConfirmation(false)}
            >
              {dictionary.confirm.no}
            </Button>
            <Button type="button" onClick={() => void confirmMarkAllRead()}>
              {dictionary.confirm.yes}
            </Button>
          </>
        }
      />
      {saving ? <AppLoadingOverlay /> : null}
    </>
  );
}

function decodeVapidPublicKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}
