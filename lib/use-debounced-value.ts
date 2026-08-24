"use client";

import { useEffect, useState } from "react";

export function useDebouncedValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    let cancelled = false;

    if (!value.trim()) {
      queueMicrotask(() => {
        if (!cancelled) setDebouncedValue(value);
      });
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
}
