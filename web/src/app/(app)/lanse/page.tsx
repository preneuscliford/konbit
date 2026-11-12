import type { Metadata } from "next";
import ComingSoon from "@/components/shell/ComingSoon";

export const metadata: Metadata = {
  title: "Lanse yon konbit",
  robots: { index: false },
};

// Étape 4 de la version web : formulaire de publication (texte, type, commune, photos).
export default function ComposePage() {
  return (
    <ComingSoon
      title="Lanse yon konbit"
      text="Talè konsa w ap ka lanse konbit ou dirèkteman isit la. Pou kounye a, itilize aplikasyon an."
    />
  );
}
