import { Suspense } from "react";

import { AboutPage } from "@/features/about/AboutPage";
import { AppRouteLayer } from "@/components/app";

export default function InterceptedAboutRoute() {
  return (
    <AppRouteLayer aria-label="About us">
      <Suspense fallback={null}>
        <AboutPage />
      </Suspense>
    </AppRouteLayer>
  );
}
