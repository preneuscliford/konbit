"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  adminErrorMessage,
  fetchAdminStats,
  type AdminStats,
} from "@/lib/admin";
import { SectionTitle, Spinner } from "./AdminShell";

function Tiles({ items }: { items: [string, number][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-2xl border border-stone-200 px-3 py-2.5"
        >
          <p className="text-2xl font-extrabold tabular-nums text-stone-900">
            {value}
          </p>
          <p className="text-xs text-stone-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

// Tableau de bord de l'équipe : comptes, appareils, contenu, modération.
export default function AdminHome() {
  const { isModerator } = useAuth();
  const [s, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isModerator) return;
    fetchAdminStats()
      .then(setStats)
      .catch((e) => setError(adminErrorMessage(e)));
  }, [isModerator]);

  if (error)
    return <p className="px-6 py-12 text-center text-stone-500">{error}</p>;
  if (!s) return <Spinner />;

  const lastDays = s.daily.slice(-7).reverse();

  return (
    <div className="px-4 pb-10">
      <SectionTitle>Kont</SectionTitle>
      <Tiles
        items={[
          ["Total", s.accounts],
          ["Nouvo (7 j)", s.accounts_new_7d],
          ["Aktif (24 è)", s.accounts_active_24h],
          ["Aktif (7 j)", s.accounts_active_7d],
        ]}
      />

      <SectionTitle>Telefòn ki itilize app la</SectionTitle>
      <Tiles
        items={[
          ["Jodi a", s.installs_today],
          ["7 jou", s.installs_7d],
          ["30 jou", s.installs_30d],
          ["Kont efase (30 j)", s.deletions_30d],
        ]}
      />
      <p className="mt-1 text-xs text-stone-500">
        Ak oswa san kont, yon fwa pa jou. {s.deletions_total} kont efase an
        tout.
      </p>

      <SectionTitle>Kontni</SectionTitle>
      <Tiles
        items={[
          ["Piblikasyon vizib", s.konbits_total],
          ["Piblikasyon (7 j)", s.konbits_7d],
          ["Repons (7 j)", s.replies_7d],
        ]}
      />

      <SectionTitle>Moderasyon</SectionTitle>
      <Tiles
        items={[
          ["Siyalman ouvè", s.reports_open],
          ["Kont limite", s.restricted],
          ["Kont sispann", s.suspended],
        ]}
      />

      {lastDays.length > 0 && (
        <>
          <SectionTitle>7 dènye jou yo</SectionTitle>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-500">
                <th className="py-1.5 font-semibold">Jou</th>
                <th className="py-1.5 text-right font-semibold">
                  Telefòn aktif
                </th>
                <th className="py-1.5 text-right font-semibold">Nouvo kont</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lastDays.map((d) => (
                <tr key={d.day}>
                  <td className="py-1.5 text-stone-700">
                    {d.day.slice(8, 10)}/{d.day.slice(5, 7)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{d.active}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {d.signups}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
