import { notFound } from "next/navigation";

import { ProfilePage } from "@/features/profile/ProfilePage";
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
  return buildNoIndexMetadata(buildSiteTitle(dictionary.tabs.profile));
}

export default async function LocalizedProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ProfilePage />;
}
