import MobileTabBar from "@/components/shell/MobileTabBar";
import RightRail from "@/components/shell/RightRail";
import SideNav from "@/components/shell/SideNav";

// Espace Konbit, disposition inspirée de X : navigation à gauche, colonne
// centrale (fil, konbit, profil), informations à droite ; onglets en bas
// sur téléphone.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-surface">
      <div className="mx-auto flex w-full max-w-[1280px] justify-center sm:px-2">
        <SideNav />
        <main className="min-h-dvh w-full min-w-0 max-w-[600px] border-stone-200 pb-20 sm:border-x sm:pb-0">
          {children}
        </main>
        <RightRail />
      </div>
      <MobileTabBar />
    </div>
  );
}
