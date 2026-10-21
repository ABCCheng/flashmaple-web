"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { isWebPushSupported } from "@/lib/web-push-client";
import {
  getUnreadWebPushMessageCount,
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
            className="pointer-events-none absolute -right-0.5 top-0.5 size-2 rounded-full bg-primary"
          />
        ) : null}
      </Link>
    </Button>
  );
}
