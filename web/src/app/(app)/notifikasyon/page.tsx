import type { Metadata } from "next";
import ComingSoon from "@/components/shell/ComingSoon";

export const metadata: Metadata = {
  title: "Notifikasyon",
  robots: { index: false },
};

// Étape 6 de la version web : liste des notifications du compte.
export default function NotificationsPage() {
  return (
    <ComingSoon
      title="Notifikasyon"
      text="W ap ka wè isit la moun ki renmen, reponn oswa antre nan konbit ou yo. Pou kounye a, gade yo nan aplikasyon an."
    />
  );
}
