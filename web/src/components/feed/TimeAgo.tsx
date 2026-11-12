"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/site";

// Heure relative façon X (« 5 min », « 3 è », « 2 j »). Le serveur et le
// premier rendu affichent la date absolue (pages en cache, pas d'écart
// d'hydratation) ; le navigateur passe ensuite au relatif.
function relative(iso: string, now: number): string {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "kounye a";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} è`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)} j`;
  return formatDate(iso);
}

export default function TimeAgo({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <time dateTime={iso} title={formatDate(iso)} suppressHydrationWarning>
      {now === null ? formatDate(iso) : relative(iso, now)}
    </time>
  );
}
