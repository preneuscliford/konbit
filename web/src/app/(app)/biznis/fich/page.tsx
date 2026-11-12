import type { Metadata } from "next";
import BusinessForm from "@/components/business/BusinessForm";
import PageHeader from "@/components/shell/PageHeader";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Fich biznis mwen",
  robots: { index: false },
};

// Créer ou modifier sa fiche business (le formulaire charge la fiche du compte).
export default async function MyBusinessPage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <PageHeader
        title="Fich biznis mwen"
        subtitle="Enfòmasyon ak kontak biznis ou"
        back
      />
      <BusinessForm communes={communes} />
    </>
  );
}
