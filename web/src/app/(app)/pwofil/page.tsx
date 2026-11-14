import type { Metadata } from "next";
import ProfileForm from "@/components/profile/ProfileForm";
import PageHeader from "@/components/shell/PageHeader";
import { getCommuneNames } from "@/lib/data";

export const metadata: Metadata = {
  title: "Modifye pwofil mwen",
  robots: { index: false },
};

// Modifier son profil (le formulaire lit le profil du compte connecté).
export default async function EditProfilePage() {
  const names = await getCommuneNames();
  const communes = Object.entries(names)
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <>
      <PageHeader title="Modifye pwofil" back />
      <ProfileForm communes={communes} />
    </>
  );
}
