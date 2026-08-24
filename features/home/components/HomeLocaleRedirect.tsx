"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { homePath } from "@/lib/i18n";
import { getPreferredLocale } from "@/lib/stores/locale";

export function HomeLocaleRedirect() {
  const router = useRouter();

  useEffect(() => {
    const preferredLocale = getPreferredLocale();
    if (preferredLocale && preferredLocale !== "en") {
      router.replace(homePath("/", preferredLocale));
    }
  }, [router]);

  return null;
}
