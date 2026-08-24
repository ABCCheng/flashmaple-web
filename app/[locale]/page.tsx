import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { HomePage } from "@/features/home/HomePage";
import { buildHomeMetadata } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.filter((locale) => locale !== "en").map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? buildHomeMetadata(locale) : {};
}

export default async function LocalizedHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <HomePage locale={locale as Locale} />;
}
