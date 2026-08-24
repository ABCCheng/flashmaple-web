import { Suspense } from "react";

import { AppRouteLayer } from "@/components/app";
import { SettingsPage } from "@/features/settings/SettingsPage";

export default function InterceptedSettingsRoute() {
  return (
    <AppRouteLayer aria-label="Settings">
      <Suspense fallback={null}>
        <SettingsPage />
      </Suspense>
    </AppRouteLayer>
  );
}
