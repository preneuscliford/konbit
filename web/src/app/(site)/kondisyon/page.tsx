import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description:
    "Kondisyon itilizasyon Konbit 509 : règles de la communauté, compte, contenu publié, modération et responsabilités.",
  alternates: { canonical: "/kondisyon" },
};

export default function Page() {
  return <LegalPage doc="kondisyon" />;
}
