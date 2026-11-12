import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ComposePrompt from "@/components/feed/ComposePrompt";
import FeedList from "@/components/feed/FeedList";
import PageHeader from "@/components/shell/PageHeader";
import { KonbitSkeleton } from "@/components/Skeleton";
import { getCommuneNames, getKonbitPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Konbit yo",
  description:
    "Tout konbit kominote ayisyen an : diskisyon, lide ak pwojè, an Ayiti kou nan dyaspora a.",
  alternates: { canonical: "/konbit" },
};

// Curseur dans l'URL : ?apre=<date>~<id> du dernier konbit de la page précédente.
function parseCursor(value: string | string[] | undefined) {
  if (typeof value !== "string") return null;
  const [createdAt, id] = value.split("~");
  const n = Number(id);
  return createdAt &&
    Number.isInteger(n) &&
    !Number.isNaN(Date.parse(createdAt))
    ? { createdAt, id: n }
    : null;
}

// Le fil de Konbit 509. La première page est rendue par le serveur (en cache,
// lisible par Google) ; la suite se charge en défilant.
export default function FeedPage({ searchParams }: PageProps<"/konbit">) {
  return (
    <>
      <PageHeader title="Konbit yo" />
      <ComposePrompt />
      <Suspense
        fallback={
          <>
            <KonbitSkeleton />
            <KonbitSkeleton />
            <KonbitSkeleton />
          </>
        }
      >
        <Feed searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Feed({
  searchParams,
}: {
  searchParams: PageProps<"/konbit">["searchParams"];
}) {
  const cursor = parseCursor((await searchParams).apre);
  const [konbits, communes] = await Promise.all([
    getKonbitPage(cursor),
    getCommuneNames(),
  ]);

  return (
    <>
      {cursor && (
        <Link
          href="/konbit"
          className="block border-b border-stone-200 py-3 text-center text-sm font-semibold text-brand hover:bg-stone-50"
        >
          ← Pi resan yo
        </Link>
      )}
      <FeedList
        key={cursor ? `${cursor.createdAt}~${cursor.id}` : "top"}
        initial={konbits}
        communes={communes}
        basePath="/konbit"
        emptyText={
          cursor ? "Pa gen lòt konbit." : "Poko gen konbit. Lanse premye a!"
        }
      />
    </>
  );
}
