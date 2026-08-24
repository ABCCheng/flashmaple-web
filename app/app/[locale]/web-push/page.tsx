import { notFound } from "next/navigation";

import { AppRouteLayer } from "@/components/app";
import { WebPushPage } from "@/features/web-push/WebPushPage";
import { defaultLocale, dictionaries, isLocale, locales } from "@/lib/i18n";
import { buildNoIndexMetadata, buildSiteTitle } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dictionary = dictionaries[isLocale(locale) ? locale : defaultLocale];
  return buildNoIndexMetadata(buildSiteTitle(dictionary.webPushPage.title));
}

export default async function LocalizedWebPushPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <AppRouteLayer preserveScroll aria-label="Notification Center">
      <WebPushPage />
    </AppRouteLayer>
  );
}
