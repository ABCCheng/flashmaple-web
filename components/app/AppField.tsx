"use client";

import type { ComponentPropsWithoutRef, FormEvent, PointerEvent, ReactNode } from "react";
import { Eye, EyeOff, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { appZIndex } from "@/lib/z-index";

type AppFieldProps = Omit<ComponentPropsWithoutRef<typeof Input>, "prefix"> & {
  error?: ReactNode;
  leadingIcon?: ReactNode;
  clearLabel?: string;
  onClear?: () => void;
  reserveErrorSpace?: boolean;
  inputClassName?: string;
};

export function AppField({
  className,
  inputClassName,
  error,
  leadingIcon,
  clearLabel = "Clear",
  onClear,
  reserveErrorSpace = true,
  value,
  disabled,
  ...props
}: AppFieldProps) {
  const canClear = Boolean(onClear && value && !disabled);
  const handleClearPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div data-slot="app-field" className={cn("text-left", className)}>
      <div className="relative block min-w-0">
        {leadingIcon ? (
          <span className={cn("pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground", appZIndex.content)}>
            {leadingIcon}
          </span>
        ) : null}
        <Input
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error) || props["aria-invalid"]}
          className={cn(
            "h-11 bg-card",
            leadingIcon && "pl-9",
            canClear && "pr-11",
            inputClassName
          )}
          {...props}
        />
        {canClear ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn("absolute inset-y-0 right-1 my-auto cursor-pointer touch-manipulation", appZIndex.contentControl)}
            aria-label={clearLabel}
            onPointerDown={handleClearPointerDown}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear?.();
            }}
          >
            <X />
          </Button>
        ) : null}
      </div>
      {reserveErrorSpace || error ? (
        <p className={cn("pt-1 text-xs text-destructive", reserveErrorSpace && "min-h-5")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AppSearchFieldProps = Omit<AppFieldProps, "leadingIcon"> & {
  showLeadingIcon?: boolean;
};

export function AppSearchField({
  clearLabel = "Clear search",
  inputClassName,
  showLeadingIcon = true,
  ...props
}: AppSearchFieldProps) {
  return (
    <AppField
      type="text"
      role="searchbox"
      leadingIcon={showLeadingIcon ? <Search className="size-4" /> : undefined}
      clearLabel={clearLabel}
      reserveErrorSpace={false}
      inputClassName={cn("h-10 rounded-lg bg-card/50", inputClassName)}
      {...props}
    />
  );
}

type AppSearchFormProps = Omit<AppSearchFieldProps, "leadingIcon" | "error" | "onSubmit"> & {
  submitLabel?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  formClassName?: string;
};

export function AppSearchForm({
  className,
  formClassName,
  inputClassName,
  showLeadingIcon = true,
  submitLabel = "Search",
  onSubmit,
  ...props
}: AppSearchFormProps) {
  return (
    <form
      data-slot="app-search-form"
      role="search"
      suppressHydrationWarning
      className={cn(
        "flex h-12 w-full min-w-0 items-center rounded-3xl border bg-secondary/80! py-0 pl-4 pr-2 backdrop-blur-xl transition-colors focus-within:border-ring/50 focus-within:bg-secondary/90",
        formClassName
      )}
      onSubmit={onSubmit}
    >
      <AppSearchField
        className={cn("min-w-0 flex-1", className)}
        inputClassName={cn(
          "h-11 border-0 bg-transparent! px-0 pr-10 shadow-none backdrop-blur-none focus-visible:ring-0 dark:bg-transparent!",
          showLeadingIcon && "pl-9",
          inputClassName
        )}
        showLeadingIcon={showLeadingIcon}
        {...props}
      />
      <Button type="submit" size="icon" variant="ghost" aria-label={submitLabel}>
        <Search />
      </Button>
    </form>
  );
}

type AppCodeFieldProps = Omit<AppFieldProps, "onClear" | "leadingIcon"> & {
  actionLabel: ReactNode;
  actionDisabled?: boolean;
  onAction: () => void;
};

export function AppCodeField({
  className,
  inputClassName,
  actionLabel,
  actionDisabled,
  onAction,
  error,
  reserveErrorSpace = true,
  disabled,
  ...props
}: AppCodeFieldProps) {
  const handleActionPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div data-slot="app-code-field" className={cn("text-left", className)}>
      <div className="flex gap-2">
        <Input
          disabled={disabled}
          aria-invalid={Boolean(error) || props["aria-invalid"]}
          className={cn("h-11 bg-card", inputClassName)}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-24 cursor-pointer touch-manipulation text-primary hover:text-primary/90 disabled:text-inherit"
          onPointerDown={handleActionPointerDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!actionDisabled && !disabled) {
              onAction();
            }
          }}
          disabled={actionDisabled || disabled}
        >
          {actionLabel}
        </Button>
      </div>
      {reserveErrorSpace || error ? (
        <p className={cn("pt-1 text-xs text-destructive", reserveErrorSpace && "min-h-5")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type AppPasswordFieldProps = Omit<AppFieldProps, "type" | "onClear" | "clearLabel"> & {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  showLabel?: string;
  hideLabel?: string;
};

export function AppPasswordField({
  className,
  error,
  disabled,
  visible,
  onVisibleChange,
  showLabel = "Show password",
  hideLabel = "Hide password",
  inputClassName,
  ...props
}: AppPasswordFieldProps) {
  const handleVisiblePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div data-slot="app-password-field" className={cn("text-left", className)}>
      <div className="relative block min-w-0">
        <Input
          {...props}
          disabled={disabled}
          aria-invalid={Boolean(error) || props["aria-invalid"]}
          className={cn("h-11 bg-card pr-11", inputClassName)}
          type={visible ? "text" : "password"}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("absolute inset-y-0 right-1 my-auto cursor-pointer touch-manipulation", appZIndex.contentControl)}
          aria-label={visible ? hideLabel : showLabel}
          disabled={disabled}
          onPointerDown={handleVisiblePointerDown}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) {
              onVisibleChange(!visible);
            }
          }}
        >
          {visible ? <Eye /> : <EyeOff />}
        </Button>
      </div>
      <p className="min-h-5 pt-1 text-xs text-destructive">{error}</p>
    </div>
  );
}
