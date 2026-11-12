import type { Metadata } from "next";
import ComposeFlow from "@/components/compose/ComposeFlow";
import PageHeader from "@/components/shell/PageHeader";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pibliye",
  robots: { index: false },
};

// Publier un simple message (par défaut). Le bouton « Konbit » en haut mène
// au formulaire du konbit (/lanse/konbit).
export default async function PostPage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <PageHeader title="Pibliye" back />
      <ComposeFlow communes={communes} mode="mesaj" />
    </>
  );
}
