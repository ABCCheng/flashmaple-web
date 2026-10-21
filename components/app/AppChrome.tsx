"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

type AppPageProps = ComponentPropsWithoutRef<"div"> & {
  padded?: boolean;
};

export function AppPage({ className, padded = true, ...props }: AppPageProps) {
  return (
    <div
      data-slot="app-page"
      className={cn(padded && "p-4", className)}
      {...props}
    />
  );
}

type AppMobileStickyHeaderProps = ComponentPropsWithoutRef<"div"> & {
  top?: "safe" | "none";
  bottomSpacer?: ReactNode;
  fallbackHeight?: string;
};

export function AppMobileStickyHeader({
  className,
  children,
  bottomSpacer,
  fallbackHeight = "calc(var(--app-safe-header-top) + 3rem)",
  ...props
}: AppMobileStickyHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const header = headerRef.current;
    const spacer = spacerRef.current;
    if (!header || !spacer) return;
    const measure = () => {
      const height = `${Math.ceil(header.getBoundingClientRect().height)}px`;
      if (spacer.style.height !== height) spacer.style.height = height;
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(header, { box: "border-box" });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <>
      <div
        ref={headerRef}
        data-slot="app-mobile-sticky-header"
        className={cn(
          "app-mobile-chrome fixed inset-x-0 top-0 w-full px-4 pb-2 md:hidden pt-(--app-safe-header-top)",
          appZIndex.navigation,
          className
        )}
        {...props}
      >
        {children}
      </div>
      <div
        ref={spacerRef}
        data-slot="app-mobile-sticky-header-spacer"
        className="md:hidden"
        style={{ height: fallbackHeight }}
        aria-hidden="true"
      />
      {bottomSpacer}
    </>
  );
}

export function AppMobileStickyHeaderSpacer({
  className,
  height,
  style,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  height: string;
}) {
  return (
    <div
      data-slot="app-mobile-sticky-header-spacer"
      className={cn("md:hidden", className)}
      style={{ height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}
