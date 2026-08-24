"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { appZIndex } from "@/lib/z-index";

const routeLayerScrollPositions = new Map<string, number>();

type AppRouteLayerProps = ComponentPropsWithoutRef<"section"> & {
  children: ReactNode;
  contentClassName?: string;
  preserveScroll?: boolean;
};

export function AppRouteLayer({
  children,
  className,
  contentClassName,
  preserveScroll = false,
  ...props
}: AppRouteLayerProps) {
  const layerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!preserveScroll || typeof window === "undefined") return;

    const layer = layerRef.current;
    if (!layer) return;

    const key = `${window.location.pathname}${window.location.search}`;
    const restore = () => {
      layer.scrollTo({
        top: routeLayerScrollPositions.get(key) ?? 0,
        behavior: "auto",
      });
    };
    const remember = () => {
      routeLayerScrollPositions.set(key, layer.scrollTop);
    };

    restore();
    const frame = window.requestAnimationFrame(restore);
    layer.addEventListener("scroll", remember, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      layer.removeEventListener("scroll", remember);
      remember();
    };
  }, [preserveScroll]);

  return (
    <section
      ref={layerRef}
      data-slot="app-route-layer"
      className={cn(
        "app-route-layer fixed inset-x-0 bottom-0 top-0 overflow-y-auto overscroll-y-contain md:top-(--app-desktop-header-height)",
        appZIndex.routeLayer,
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "min-h-full w-full md:mx-auto md:w-[min(100%,840px)]",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
