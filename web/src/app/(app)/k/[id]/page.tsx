import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import KonbitDetail from "@/components/feed/KonbitDetail";
import PageHeader from "@/components/shell/PageHeader";
import { KonbitSkeleton } from "@/components/Skeleton";
import {
  getCommuneNames,
  getKonbit,
  getRecentKonbits,
  getReplies,
  mediaUrl,
} from "@/lib/data";
import { formatKonbitRange } from "@/lib/konbit-time";
import { displayName, excerpt } from "@/lib/site";

// Quelques konbits récents sont générés au build ; les autres à la première
// visite, puis resservis depuis le cache (bon pour Google et les petites connexions).
export async function generateStaticParams() {
  const recent = await getRecentKonbits(20);
  return recent.length
    ? recent.map((k) => ({ id: String(k.id) }))
    : [{ id: "0" }];
}

const parseId = (id: string) => (/^\d+$/.test(id) ? Number(id) : null);

export async function generateMetadata({
  params,
}: PageProps<"/k/[id]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const k = id ? await getKonbit(id) : null;
  if (!k) return { title: "Konbit pa jwenn" };
  const author = displayName(k.author_name, k.author_pseudo);
  const image = k.media.find((m) => m.type === "image");
  // Konbit (action collective) : son nom, ses dates et son lieu.
  const isKonbit = k.kind === "konbit" && k.title && k.starts_at && k.ends_at;
  const when = isKonbit ? formatKonbitRange(k.starts_at!, k.ends_at!) : "";
  const description = isKonbit
    ? excerpt(`${when}. ${k.body}`)
    : excerpt(k.body);
  return {
    title: isKonbit
      ? `${k.title} · Konbit`
      : `${author} : ${excerpt(k.body, 60)}`,
    description,
    alternates: { canonical: `/k/${k.id}` },
    openGraph: {
      type: "article",
      title: isKonbit ? `Konbit : ${k.title}` : `${author} sou Konbit 509`,
      description,
      images: image
        ? [
            {
              url: mediaUrl(image.path),
              width: image.width,
              height: image.height,
            },
          ]
        : undefined,
    },
  };
}

// Les paramètres d'URL sont lus dans un Suspense : squelette tout de suite,
// contenu dès qu'il arrive (règle des Cache Components).
export default function KonbitPage({ params }: PageProps<"/k/[id]">) {
  return (
    <>
      <PageHeader title="Konbit" back />
      <Suspense fallback={<KonbitSkeleton />}>
        <KonbitView params={params} />
      </Suspense>
    </>
  );
}

async function KonbitView({
  params,
}: {
  params: PageProps<"/k/[id]">["params"];
}) {
  const id = parseId((await params).id);
  const k = id ? await getKonbit(id) : null;
  if (!k) notFound();
  const [replies, communes] = await Promise.all([
    getReplies(k.id),
    getCommuneNames(),
  ]);

  return (
    <KonbitDetail
      konbit={k}
      communeName={communes[k.commune_slug] ?? k.commune_slug}
      replies={replies}
    />
  );
}
