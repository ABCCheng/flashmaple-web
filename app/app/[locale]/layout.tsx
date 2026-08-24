import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { AppPersistentRouteSlot } from "@/components/app/AppPersistentRouteSlot";
import { FlashMoodProvider } from "@/components/providers/flash-mood-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { PageRefreshProvider } from "@/components/providers/page-refresh-provider";
import { RegionProvider } from "@/components/providers/region-provider";
import { Suspense } from "react";

export default function LocalizedLayout({
  children,
  detail,
}: {
  children: ReactNode;
  detail: ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <LocaleProvider>
        <RegionProvider>
          <FlashMoodProvider>
            <PageRefreshProvider>
              <AppShell>
                <AppPersistentRouteSlot>{children}</AppPersistentRouteSlot>
                {detail}
              </AppShell>
            </PageRefreshProvider>
          </FlashMoodProvider>
        </RegionProvider>
      </LocaleProvider>
    </Suspense>
  );
}
