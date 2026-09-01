"use client";

import { ArrowUpToLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAppScrollRoot, getAppScrollTop, scrollAppToTop } from "@/lib/app-scroll";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

const DEFAULT_VISIBLE_OFFSET = 360;

type AppBackToTopButtonProps = Omit<ComponentPropsWithoutRef<typeof Button>, "children" | "onClick" | "size"> & {
  visibleOffset?: number;
};

export function AppBackToTopButton({
  className,
  visibleOffset = DEFAULT_VISIBLE_OFFSET,
  "aria-label": ariaLabel = "Back to top",
  ...props
}: AppBackToTopButtonProps) {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const spinnerRef = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const spinner = spinnerRef.current;
    if (!spinner) return;

    for (const animation of spinner.getAnimations()) {
      animation.cancel();
      animation.play();
    }
  }, [pathname]);

  useEffect(() => {
    let root = getAppScrollRoot();
    let frame = 0;

    const updateVisible = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextVisible = getAppScrollTop() >= visibleOffset;
        const button = buttonRef.current;
        if (!nextVisible && document.activeElement === button) {
          button?.blur();
        }
        setVisible(nextVisible);
      });
    };

    const syncScrollRoot = () => {
      const nextRoot = getAppScrollRoot();
      if (nextRoot !== root) {
        root?.removeEventListener("scroll", updateVisible);
        root = nextRoot;
        root?.addEventListener("scroll", updateVisible, { passive: true });
      }
      updateVisible();
    };

    updateVisible();
    root?.addEventListener("scroll", updateVisible, { passive: true });
    window.addEventListener("scroll", updateVisible, { passive: true });
    window.addEventListener("resize", syncScrollRoot, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      root?.removeEventListener("scroll", updateVisible);
      window.removeEventListener("scroll", updateVisible);
      window.removeEventListener("resize", syncScrollRoot);
    };
  }, [visibleOffset]);

  return (
    <Button
      ref={buttonRef}
      type="button"
      size="icon-md"
      variant="outline"
      className={cn(
        "fixed bottom-(--app-safe-tab-bottom) right-4 isolate cursor-pointer rounded-full border-primary/30 bg-background/80 text-primary shadow-[0_8px_24px_rgb(0_0_0_/_0.16)] backdrop-blur-xl transition-[opacity,background-color,box-shadow] duration-300 hover:border-primary/60 hover:bg-primary/10 hover:text-primary hover:shadow-[0_12px_34px_rgb(0_0_0_/_0.24)] dark:bg-card/70 dark:shadow-black/40 motion-reduce:transition-none md:bottom-6 md:right-[max(1rem,calc((100vw-840px)/2-3.5rem))]",
        appZIndex.backToTop,
        className,
        visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-label={ariaLabel}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => void scrollAppToTop("smooth")}
      {...props}
    >
      <span
        ref={spinnerRef}
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-full border border-primary/15 border-t-primary/90 border-r-primary/60 opacity-90 motion-safe:animate-[spin_12s_linear_infinite] motion-reduce:animate-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2 rounded-full bg-primary/15 opacity-60 blur-lg transition-opacity duration-300 group-hover/button:opacity-100"
      />
      <ArrowUpToLine className="relative size-5 drop-shadow-[0_0_6px_rgb(255_255_255/0.35)] transition-transform duration-300 group-hover/button:-translate-y-0.5 motion-reduce:transition-none" />
    </Button>
  );
}
