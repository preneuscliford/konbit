import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import BusinessCard from "@/components/business/BusinessCard";
import CommuneFilter from "@/components/business/CommuneFilter";
import MyBusinessButton from "@/components/business/MyBusinessButton";
import PageHeader from "@/components/shell/PageHeader";
import { KonbitSkeleton } from "@/components/Skeleton";
import { BUSINESS_CATEGORIES, categoryLabel, isCategory } from "@/lib/business";
import { getBusinesses, getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Biznis yo",
  description:
    "Biznis ayisyen yo sou Konbit 509 : manje, komès, sèvis, fòmasyon… Kontak dirèk ak katalòg, pa komin.",
  alternates: { canonical: "/biznis" },
};

// Annuaire des fiches business, filtrable par catégorie (?kategori=) et commune (?komin=).
export default function BusinessesPage({ searchParams }: PageProps<"/biznis">) {
  return (
    <>
      <PageHeader
        title="Biznis yo"
        subtitle="Jwenn biznis kominote a, kontakte yo dirèkteman"
      />
      <Suspense
        fallback={
          <>
            <KonbitSkeleton />
            <KonbitSkeleton />
          </>
        }
      >
        <Directory searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Directory({
  searchParams,
}: {
  searchParams: PageProps<"/biznis">["searchParams"];
}) {
  const params = await searchParams;
  const category = isCategory(params.kategori) ? params.kategori : "";
  const names = await getCommuneNames();
  const commune =
    typeof params.komin === "string" && names[params.komin] ? params.komin : "";
  const businesses = await getBusinesses({
    category: category || undefined,
    commune: commune || undefined,
  });
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  const href = (cat: string) => {
    const q = new URLSearchParams();
    if (cat) q.set("kategori", cat);
    if (commune) q.set("komin", commune);
    const s = q.toString();
    return s ? `/biznis?${s}` : "/biznis";
  };
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
      active
        ? "border-brand bg-brand text-white"
        : "border-stone-300 text-stone-700 hover:bg-stone-50"
    }`;

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
        <CommuneFilter
          communes={communes}
          value={commune}
          category={category}
        />
        <MyBusinessButton />
      </div>
      <nav
        aria-label="Kategori"
        className="flex gap-2 overflow-x-auto border-b border-stone-200 px-4 py-3 [scrollbar-width:none]"
      >
        <Link href={href("")} className={chip(!category)}>
          Tout
        </Link>
        {BUSINESS_CATEGORIES.map((c) => (
          <Link
            key={c.value}
            href={href(c.value)}
            className={chip(category === c.value)}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {businesses.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-bold text-stone-900">
            {category || commune
              ? "Pa gen biznis pou chwa sa a."
              : "Poko gen biznis."}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-stone-600">
            {category
              ? `Ou gen yon biznis nan « ${categoryLabel(category)} »? Kreye fich ou, li gratis.`
              : "Ou gen yon biznis? Kreye fich ou gratis pou kominote a ka jwenn ou."}
          </p>
        </div>
      ) : (
        businesses.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            communeName={names[b.commune_slug] ?? b.commune_slug}
          />
        ))
      )}
    </>
  );
}
