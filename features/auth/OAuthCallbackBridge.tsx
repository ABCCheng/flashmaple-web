"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppLoadingOverlay } from "@/components/app";
import { defaultLocale, localizePath } from "@/lib/i18n";
import { peekSocialAuthState } from "@/lib/oauth";
import { getPreferredLocale } from "@/lib/stores/locale";

export function OAuthCallbackBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    const callbackParams = new URLSearchParams(searchParamsString);
    const oauthLocale = peekSocialAuthState(callbackParams.get("state"))?.locale;
    const locale = oauthLocale ?? getPreferredLocale() ?? defaultLocale;
    const authPath = localizePath("/auth", locale);
    const target = searchParamsString ? `${authPath}?${searchParamsString}` : authPath;

    router.replace(target);
  }, [router, searchParamsString]);

  return <AppLoadingOverlay />;
}
