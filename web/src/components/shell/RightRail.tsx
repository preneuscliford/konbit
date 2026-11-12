import Link from "next/link";
import { AppButton } from "@/components/SiteChrome";
import { LEGAL } from "@/lib/site";

// Colonne de droite (grand écran) : l'app, à quoi sert Konbit 509, liens utiles.
export default function RightRail() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[340px] shrink-0 flex-col gap-4 overflow-y-auto py-3 pl-6 lg:flex">
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-lg font-extrabold text-stone-900">
          Ann fè konbit ansanm
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
          Pataje lide w ak pwojè w, diskite, epi rasanble moun pou aji ansanm,
          an Ayiti kou nan dyaspora a.
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-lg font-extrabold text-stone-900">Aplikasyon an</h2>
        <p className="mb-3 mt-1.5 text-sm leading-relaxed text-stone-600">
          Resevwa notifikasyon yo dirèkteman sou telefòn ou.
        </p>
        <AppButton small />
      </section>

      <nav className="flex flex-wrap gap-x-3 gap-y-1 px-4 text-[13px] text-stone-500">
        <Link href="/" className="hover:underline">
          Sou Konbit 509
        </Link>
        <a href={LEGAL.terms} className="hover:underline">
          Kondisyon
        </a>
        <a href={LEGAL.privacy} className="hover:underline">
          Konfidansyalite
        </a>
        <a href={LEGAL.childSafety} className="hover:underline">
          Sekirite timoun
        </a>
        <a href="mailto:konbit@haitiscope.com" className="hover:underline">
          Kontak
        </a>
        <span>© 2026 Konbit 509</span>
      </nav>
    </aside>
  );
}
