import Link from "next/link";
import { getLegalHtml, type LegalDoc } from "@/lib/legal";

const LINKS: { doc: LegalDoc; href: string; label: string }[] = [
  { doc: "kondisyon", href: "/kondisyon", label: "Kondisyon itilizasyon" },
  {
    doc: "konfidansyalite",
    href: "/konfidansyalite",
    label: "Konfidansyalite",
  },
  {
    doc: "sekirite-timoun",
    href: "/sekirite-timoun",
    label: "Sekirite timoun",
  },
];

// Page légale : texte en lecture confortable sur téléphone, liens vers les
// deux autres pages en bas.
export default async function LegalPage({ doc }: { doc: LegalDoc }) {
  const { title, html } = await getLegalHtml(doc);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
        {title}
      </h1>
      <div className="legal mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      <nav
        aria-label="Lòt paj legal"
        className="mt-12 flex flex-wrap gap-3 border-t border-stone-200 pt-6"
      >
        {LINKS.filter((l) => l.doc !== doc).map((l) => (
          <Link
            key={l.doc}
            href={l.href}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-brand hover:text-brand"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </article>
  );
}
