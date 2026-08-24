"use client";

import { useLayoutEffect } from "react";

export function HomeSurfaceScope() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("home-surface");

    return () => {
      root.classList.remove("home-surface");
    };
  }, []);

  return null;
}
