"use client";

import { Fragment, type ReactNode } from "react";

import { useThemeContext } from "@/components/providers/theme-provider";

export function HomeThemeChrome({ children }: { children: ReactNode }) {
  const { isDark } = useThemeContext();

  // Remount the sticky chrome so mobile Safari repaints its composited
  // safe-area background immediately after a theme change.
  return <Fragment key={isDark ? "dark" : "light"}>{children}</Fragment>;
}
