import type { Metadata } from "next";

import { HomeLocaleRedirect } from "@/features/home/components/HomeLocaleRedirect";
import { HomePage } from "@/features/home/HomePage";
import { buildHomeMetadata } from "@/lib/seo";

export const metadata: Metadata = buildHomeMetadata("en");

export default function PublicHomePage() {
  return (
    <>
      <HomeLocaleRedirect />
      <HomePage locale="en" />
    </>
  );
}
