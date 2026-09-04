"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { useDismissibleMenu } from "@/lib/use-dismissible-menu";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

const headerMenuSurfaceClass =
  "absolute right-0 top-[calc(100%+0.5rem)] grid gap-0.5 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_46px_rgba(28,28,30,0.16)] backdrop-blur-xl";
const headerMenuItemClass =
  "flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-primary/10 hover:text-foreground [&_svg]:size-4 [&_svg]:text-primary";

type HomeNavMenuProps = {
  overviewLabel: string;
  faqLabel: string;
  changelogLabel: string;
  discoverMoreLabel: string;
  discoverMoreHref: string;
  launchLabel: string;
  appHref: string;
};

export function HomeNavMenu({
  overviewLabel,
  faqLabel,
  changelogLabel,
  discoverMoreLabel,
  discoverMoreHref,
  launchLabel,
  appHref,
}: HomeNavMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  useDismissibleMenu(open, menuRef, setOpen);

  return (
    <div className="relative xl:hidden" ref={menuRef}>
      <button
        type="button"
        className="grid size-10 place-items-center rounded-xl border border-border text-foreground"
        aria-label="Navigation menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <div className={cn(headerMenuSurfaceClass, "w-56", appZIndex.menu)} role="menu">
          <a className={cn(headerMenuItemClass, "whitespace-nowrap")} href="#overview" role="menuitem" onClick={() => setOpen(false)}>{overviewLabel}</a>
          <a className={cn(headerMenuItemClass, "whitespace-nowrap")} href="#faq" role="menuitem" onClick={() => setOpen(false)}>{faqLabel}</a>
          <a className={cn(headerMenuItemClass, "whitespace-nowrap")} href="#changelog" role="menuitem" onClick={() => setOpen(false)}>{changelogLabel}</a>
          <a className={cn(headerMenuItemClass, "whitespace-nowrap")} href={discoverMoreHref} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setOpen(false)}>{discoverMoreLabel}</a>
          <Link className={cn(headerMenuItemClass, "whitespace-nowrap font-semibold text-primary")} href={appHref} role="menuitem" onClick={() => setOpen(false)}>{launchLabel}</Link>
        </div>
      ) : null}
    </div>
  );
}
