"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

export function HomeFaq({ items }: { items: ReadonlyArray<FaqItem> }) {
  const detailsRefs = useRef<Array<HTMLDetailsElement | null>>([]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const syncDefaultState = () => {
      detailsRefs.current.forEach((details) => {
        if (details) details.open = desktop.matches;
      });
    };

    syncDefaultState();
    desktop.addEventListener("change", syncDefaultState);
    return () => desktop.removeEventListener("change", syncDefaultState);
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item, index) => (
        <details
          data-home-reveal
          data-home-reveal-delay={String((index % 3) * 80)}
          className="group min-h-0 rounded-2xl border border-border bg-card/70 p-5"
          key={item.question}
          ref={(element) => {
            detailsRefs.current[index] = element;
          }}
        >
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-extrabold tracking-[-0.03em] [&::-webkit-details-marker]:hidden">
            <span>{item.question}</span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
