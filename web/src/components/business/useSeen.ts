"use client";

import { useEffect, useRef, type RefObject } from "react";

// Appelle onSeen une fois quand l'élément reste visible au moins à moitié
// pendant 1 seconde d'affilée (norme IAB/MRC d'une impression « vue »).
export function useSeen<T extends Element>(
  ref: RefObject<T | null>,
  onSeen: () => void,
  enabled = true,
) {
  const cb = useRef(onSeen);
  useEffect(() => {
    cb.current = onSeen;
  }, [onSeen]);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (done) return;
        if (
          entry.intersectionRatio >= 0.5 &&
          document.visibilityState === "visible"
        ) {
          timer ??= setTimeout(() => {
            done = true;
            observer.disconnect();
            cb.current();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ref, enabled]);
}
