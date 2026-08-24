import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";
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
};

export function AppMobileStickyHeader({
  className,
  children,
  bottomSpacer,
  ...props
}: AppMobileStickyHeaderProps) {
  return (
    <>
      <div
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
