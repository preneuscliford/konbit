"use client";

import { useEffect, useState } from "react";
import type { Konbit } from "@/lib/data";
import {
  formatKonbitRange,
  konbitStatus,
  STATUS_LABEL,
  type KonbitStatus,
} from "@/lib/konbit-time";

const STATUS_STYLE: Record<KonbitStatus, string> = {
  upcoming: "bg-blue-50 text-brand",
  ongoing: "bg-emerald-50 text-emerald-700",
  ended: "bg-stone-100 text-stone-500",
};

// Statut calculé dans le navigateur (les pages sont en cache) : rien au
// premier rendu, puis « Ap vini », « An kou » ou « Fini ».
export function useKonbitStatus(
  k: Pick<Konbit, "starts_at" | "ends_at">,
): KonbitStatus | null {
  const [status, setStatus] = useState<KonbitStatus | null>(null);
  useEffect(() => {
    if (!k.starts_at || !k.ends_at) return;
    const update = () => setStatus(konbitStatus(k.starts_at!, k.ends_at!));
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [k.starts_at, k.ends_at]);
  return status;
}

// Nom, statut, dates, lieu et participants d'un konbit (action collective).
export default function KonbitSummary({
  konbit: k,
  communeName,
  status,
  full = false,
}: {
  konbit: Konbit;
  communeName: string;
  status: KonbitStatus | null;
  full?: boolean;
}) {
  if (!k.title || !k.starts_at || !k.ends_at) return null;
  // L'organisateur fait partie du konbit.
  const members = k.participant_count + 1;

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-brand px-1.5 py-px text-[11px] font-bold uppercase tracking-wide text-white">
          Konbit
        </span>
        {status && (
          <span
            className={`rounded-md px-1.5 py-px text-[11px] font-bold ${STATUS_STYLE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
      <h3
        className={`mt-1.5 font-extrabold leading-snug text-stone-900 ${full ? "text-2xl" : "text-[17px]"}`}
      >
        {k.title}
      </h3>

      <dl className="mt-2 space-y-1 text-[14px] text-stone-700">
        <div className="flex gap-2">
          <dt className="w-5 shrink-0 text-center" aria-label="Kilè">
            🗓
          </dt>
          <dd>{formatKonbitRange(k.starts_at, k.ends_at)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-5 shrink-0 text-center" aria-label="Ki kote">
            📍
          </dt>
          <dd>
            {communeName}
            {k.address_detail && (
              <span className="text-stone-500"> · {k.address_detail}</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-5 shrink-0 text-center" aria-label="Ki moun">
            👥
          </dt>
          <dd>
            <b className="text-stone-900">{members}</b>
            {k.max_participants ? ` / ${k.max_participants}` : ""} moun ladan
            {k.max_participants && members >= k.max_participants && (
              <span className="ml-1.5 font-bold text-brand-red">· Plen</span>
            )}
          </dd>
        </div>
      </dl>

      <p
        className={`mt-2.5 whitespace-pre-line break-words text-stone-800 ${
          full
            ? "text-[16px] leading-relaxed"
            : "line-clamp-3 text-[15px] leading-normal"
        }`}
      >
        {k.body}
      </p>
    </div>
  );
}
