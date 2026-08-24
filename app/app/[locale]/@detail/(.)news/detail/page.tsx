import { notFound } from "next/navigation";

import { NewsDetailPage } from "@/features/news/NewsDetailPage";
import { AppRouteLayer } from "@/components/app";
import { isLocale } from "@/lib/i18n";

type InterceptedNewsDetailRouteProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string }>;
};

export default async function InterceptedNewsDetailRoute({
  params,
  searchParams,
}: InterceptedNewsDetailRouteProps) {
  const [{ locale }, { id }] = await Promise.all([params, searchParams]);
  const newsId = Number(id);
  if (!isLocale(locale) || !Number.isInteger(newsId) || newsId <= 0) notFound();

  return (
    <AppRouteLayer data-news-detail-scroll-root aria-label="News detail">
      <NewsDetailPage id={newsId} />
    </AppRouteLayer>
  );
}
