"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/class-names";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input shadow-inner transition-colors outline-none",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-(--switch-thumb) shadow-md ring-0 transition-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
