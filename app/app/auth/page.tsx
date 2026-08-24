import type { Metadata } from "next";
import { Suspense } from "react";

import { OAuthCallbackBridge } from "@/features/auth/OAuthCallbackBridge";
import { AppLoadingOverlay } from "@/components/app";
import { defaultLocale, dictionaries } from "@/lib/i18n";
import { buildNoIndexMetadata, buildSiteTitle } from "@/lib/seo";

export const metadata: Metadata = buildNoIndexMetadata(
  buildSiteTitle(dictionaries[defaultLocale].auth.titleLogin),
);

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<AppLoadingOverlay />}>
      <OAuthCallbackBridge />
    </Suspense>
  );
}
