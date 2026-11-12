import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de Konbit 509 : données collectées, utilisation, partage, conservation, droits et suppression du compte.",
  alternates: { canonical: "/konfidansyalite" },
};

export default function Page() {
  return <LegalPage doc="konfidansyalite" />;
}
