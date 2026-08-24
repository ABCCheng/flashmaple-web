import { notFound } from "next/navigation";

import { FavoritesPage } from "@/features/favorites/FavoritesPage";
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
  return buildNoIndexMetadata(buildSiteTitle(dictionary.tabs.favorites));
}

export default async function LocalizedFavoritesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <FavoritesPage />;
}
