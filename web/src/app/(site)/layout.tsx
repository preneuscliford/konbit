import { Footer, Header } from "@/components/SiteChrome";

// Vitrine (accueil) : en-tête et pied de page classiques.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
