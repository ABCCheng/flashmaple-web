"use client";

import { useEffect } from "react";

const revealSelector = "[data-home-reveal]";

export function HomeRevealObserver({ instanceKey }: { instanceKey: string }) {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
    const reveal = (element: HTMLElement) => {
      element.dataset.homeRevealed = "true";
    };

    elements.forEach((element) => {
      element.removeAttribute("data-home-revealed");
      const delay = Number(element.dataset.homeRevealDelay ?? 0);
      element.style.setProperty("--home-reveal-delay", `${Number.isFinite(delay) ? delay : 0}ms`);
    });

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [instanceKey]);

  return (
    <>
      <style>{`
        [data-home-reveal] {
          opacity: 0;
          translate: 0 1.5rem;
          scale: 0.985;
          filter: blur(3px);
          transition-property: opacity, translate, scale, filter, transform, box-shadow, border-color;
          transition-duration: 700ms;
          transition-delay: var(--home-reveal-delay, 0ms);
          transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, translate, scale, filter;
        }

        [data-home-reveal][data-home-revealed="true"] {
          opacity: 1;
          translate: 0 0;
          scale: 1;
          filter: blur(0);
        }

        @media (prefers-reduced-motion: reduce) {
          [data-home-reveal] {
            opacity: 1;
            translate: none;
            scale: 1;
            filter: none;
            transition: none;
          }
        }
      `}</style>
      <noscript>
        <style>{`${revealSelector} { opacity: 1 !important; translate: none !important; scale: 1 !important; filter: none !important; }`}</style>
      </noscript>
    </>
  );
}
