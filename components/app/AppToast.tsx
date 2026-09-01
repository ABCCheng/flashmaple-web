import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

export function AppToastViewport({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="app-toast-viewport"
      className={cn(
        "fixed bottom-(--app-safe-tab-bottom) left-1/2 w-[90%] max-w-md -translate-x-1/2 transition-all duration-200",
        appZIndex.toast,
        className
      )}
      {...props}
    />
  );
}

export function AppToast({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="app-toast"
      role="status"
      className={cn(
        "rounded-lg border border-border bg-popover-foreground px-4 py-3 text-sm text-center text-popover",
        className
      )}
      {...props}
    />
  );
}
