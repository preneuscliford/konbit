import { useCallback, useEffect, useRef } from "react";
import { AppState, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

// Cartes d'une liste dans un ScrollView : onSeen(id) une fois quand une carte
// reste visible au moins à moitié pendant 1 seconde d'affilée (norme IAB/MRC).
// La grille doit être un enfant direct du contenu du ScrollView.
export function useSeenInScroll(onSeen: (id: number) => void, enabled: boolean) {
  const cards = useRef(new Map<number, { y: number; h: number }>());
  const gridY = useRef(0);
  const scrollY = useRef(0);
  const viewH = useRef(0);
  const since = useRef(new Map<number, number>());
  const done = useRef(new Set<number>());
  const cb = useRef(onSeen);
  useEffect(() => {
    cb.current = onSeen;
  }, [onSeen]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== "active" || viewH.current === 0) return;
      const now = Date.now();
      const top = scrollY.current;
      const bottom = top + viewH.current;
      for (const [id, c] of cards.current) {
        if (done.current.has(id) || c.h <= 0) continue;
        const y0 = gridY.current + c.y;
        const visible = Math.max(0, Math.min(y0 + c.h, bottom) - Math.max(y0, top));
        if (visible / c.h >= 0.5) {
          const start = since.current.get(id);
          if (start === undefined) since.current.set(id, now);
          else if (now - start >= 1000) {
            done.current.add(id);
            cb.current(id);
          }
        } else {
          since.current.delete(id);
        }
      }
    }, 250);
    return () => clearInterval(timer);
  }, [enabled]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);
  const onViewportLayout = useCallback((e: LayoutChangeEvent) => {
    viewH.current = e.nativeEvent.layout.height;
  }, []);
  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    gridY.current = e.nativeEvent.layout.y;
  }, []);
  const onCardLayout = useCallback(
    (id: number) => (e: LayoutChangeEvent) => {
      cards.current.set(id, { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height });
    },
    [],
  );

  return { onScroll, onViewportLayout, onGridLayout, onCardLayout };
}
