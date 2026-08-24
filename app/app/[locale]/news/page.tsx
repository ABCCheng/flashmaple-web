import { notFound } from "next/navigation";

import { ExplorePage } from "@/features/news/ExplorePage";
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
  return buildNoIndexMetadata(buildSiteTitle(dictionary.tabs.explore));
}

export default async function LocalizedNewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ExplorePage />;
}
