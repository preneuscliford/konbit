"use client";

import { useRouter } from "next/navigation";

// Filtre par commune de l'annuaire (garde la catégorie choisie).
export default function CommuneFilter({
  communes,
  value,
  category,
}: {
  communes: { slug: string; name: string }[];
  value: string;
  category: string;
}) {
  const router = useRouter();

  return (
    <select
      value={value}
      aria-label="Komin"
      onChange={(e) => {
        const params = new URLSearchParams();
        if (category) params.set("kategori", category);
        if (e.target.value) params.set("komin", e.target.value);
        const query = params.toString();
        router.push(query ? `/biznis?${query}` : "/biznis");
      }}
      className="rounded-full border border-stone-300 bg-surface px-4 py-2 text-sm font-semibold text-stone-800 outline-none focus:border-brand"
    >
      <option value="">Tout komin yo</option>
      {communes.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
