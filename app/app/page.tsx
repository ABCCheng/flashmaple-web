"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { defaultLocale } from "@/lib/i18n";
import { getPreferredLocale } from "@/lib/stores/locale";

export default function AppEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const locale = getPreferredLocale() ?? defaultLocale;
    router.replace(`/app/${locale}`);
  }, [router]);

  return null;
}
