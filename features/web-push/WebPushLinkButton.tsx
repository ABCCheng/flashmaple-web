"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { isWebPushSupported } from "@/lib/web-push-client";
import {
  getUnreadWebPushMessageCount,
  getWebPushMessages,
  subscribeWebPushMessageChanges,
} from "@/lib/stores/web-push-messages";

function subscribeToWebPushSupport() {
  return () => {};
}

export function WebPushLinkButton({ href, label }: { href: string; label: string }) {
  const supported = useSyncExternalStore(
    subscribeToWebPushSupport,
    isWebPushSupported,
    () => false,
  );
  const unreadCount = useSyncExternalStore(
    subscribeWebPushMessageChanges,
    getUnreadWebPushMessageCount,
    () => 0,
  );

  useEffect(() => {
    void getWebPushMessages();
  }, []);

  if (!supported) return null;

  return (
    <Button asChild size="icon" variant="destructive" className="cursor-pointer text-primary">
      <Link
        href={href}
        scroll={false}
        aria-label={unreadCount ? `${label} (${unreadCount})` : label}
        className="relative"
      >
        <Bell />
        {unreadCount ? (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex min-w-4 select-none items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold leading-4 text-white"
          >
            {unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
