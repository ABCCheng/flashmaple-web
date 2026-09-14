import { WebPushPage } from "@/features/web-push/WebPushPage";
import { AppRouteLayer } from "@/components/app";

export default function InterceptedWebPushRoute() {
  return (
    <AppRouteLayer preserveScroll aria-label="Notification Center">
      <WebPushPage />
    </AppRouteLayer>
  );
}
