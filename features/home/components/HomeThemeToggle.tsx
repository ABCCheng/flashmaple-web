"use client";

import { Moon, Sun } from "lucide-react";

import { useThemeContext } from "@/components/providers/theme-provider";

export function HomeThemeToggle({ label }: { label: string }) {
  const { isDark, setThemeMode } = useThemeContext();

  return (
    <button
      type="button"
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card/70 text-foreground transition hover:border-primary/40 hover:text-primary"
      aria-label={`${label}: ${isDark ? "light" : "dark"}`}
      onClick={() => setThemeMode(isDark ? "light" : "dark")}
    >
      <Moon className="size-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 dark:block" aria-hidden="true" />
    </button>
  );
}
