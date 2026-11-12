import type { Metadata } from "next";
import ComposeFlow from "@/components/compose/ComposeFlow";
import PageHeader from "@/components/shell/PageHeader";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Lanse yon konbit",
  robots: { index: false },
};

// Lancer un konbit (action collective) en 4 étapes : Kisa, Ki kote, Kilè, Ki moun.
export default async function NewKonbitPage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <PageHeader
        title="Lanse yon konbit"
        subtitle="Yon aksyon ansanm, nan yon kote, pandan yon tan"
        back
      />
      <ComposeFlow communes={communes} mode="konbit" />
    </>
  );
}
