"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { homePath, localeNames, locales, type Locale } from "@/lib/i18n";
import { savePreferredLocale } from "@/lib/stores/locale";
import { useDismissibleMenu } from "@/lib/use-dismissible-menu";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

const headerMenuSurfaceClass =
  "absolute right-0 top-[calc(100%+0.5rem)] grid gap-0.5 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_46px_rgba(28,28,30,0.16)] backdrop-blur-xl";
const headerMenuItemClass =
  "flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-primary/10 hover:text-foreground [&_svg]:size-4 [&_svg]:text-primary";

export function HomeLanguageMenu({ locale }: { locale: Locale }) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  useDismissibleMenu(open, menuRef, setOpen);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="inline-flex size-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/70 px-0 text-xs font-bold text-foreground transition hover:border-primary/40 sm:w-auto sm:px-3"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Languages className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <ChevronDown className="hidden size-3.5 sm:block" aria-hidden="true" />
      </button>
      {open ? (
        <div className={cn(headerMenuSurfaceClass, "w-48", appZIndex.menu)} role="menu">
          {locales.map((nextLocale) => (
            <Link
              key={nextLocale}
              href={homePath("/", nextLocale)}
              hrefLang={nextLocale}
              role="menuitem"
              className={cn(headerMenuItemClass, "justify-between")}
              onClick={() => {
                savePreferredLocale(nextLocale);
                setOpen(false);
              }}
            >
              <span>{localeNames[nextLocale]}</span>
              {nextLocale === locale ? <Check className="text-primary" aria-hidden="true" /> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
