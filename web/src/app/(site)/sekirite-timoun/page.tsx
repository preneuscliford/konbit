import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Normes de sécurité des enfants",
  description:
    "Normes de sécurité des enfants de Konbit 509 : tolérance zéro contre l'exploitation et les abus sur mineurs, signalement et mesures prises.",
  alternates: { canonical: "/sekirite-timoun" },
};

export default function Page() {
  return <LegalPage doc="sekirite-timoun" />;
}
