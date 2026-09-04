import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/class-names";
import { appZIndex } from "@/lib/z-index";

export function AppLoadingOverlay({
  className,
  label,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  label?: ReactNode;
}) {
  return (
    <div
      data-slot="app-loading-overlay"
      className={cn("fixed inset-0 flex items-center justify-center", appZIndex.loading, className)}
      {...props}
    >
      <span className="inline-flex flex-col items-center gap-2 text-sm font-medium text-muted-foreground">
        <Loader className="h-10 w-10 animate-spin text-primary" />
        {label ? <span>{label}</span> : null}
      </span>
    </div>
  );
}

export function AppCenteredState({
  className,
  title,
  description,
  actionLabel,
  onAction,
  children,
  muted = false,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  title?: ReactNode;
  description?: ReactNode;
  actionLabel?: ReactNode;
  onAction?: () => void;
  muted?: boolean;
}) {
  return (
    <div
      data-slot="app-centered-state"
      className={cn(
        "fixed inset-0 flex items-center justify-center text-center",
        appZIndex.content,
        muted && "text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children ?? (
        <div className="flex w-full flex-col items-center justify-center space-y-3 p-6">
          {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          {actionLabel && onAction ? <Button className="cursor-pointer" onClick={onAction}>{actionLabel}</Button> : null}
        </div>
      )}
    </div>
  );
}
