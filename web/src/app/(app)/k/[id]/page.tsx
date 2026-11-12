import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import KonbitDetail from "@/components/feed/KonbitDetail";
import TimeAgo from "@/components/feed/TimeAgo";
import PageHeader from "@/components/shell/PageHeader";
import { AppButton } from "@/components/SiteChrome";
import { KonbitSkeleton } from "@/components/Skeleton";
import {
  getCommuneNames,
  getKonbit,
  getRecentKonbits,
  getReplies,
  mediaUrl,
} from "@/lib/data";
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
  return {
    title: `${author} : ${excerpt(k.body, 60)}`,
    description: excerpt(k.body),
    alternates: { canonical: `/k/${k.id}` },
    openGraph: {
      type: "article",
      title: `${author} sou Konbit 509`,
      description: excerpt(k.body),
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
    <>
      <KonbitDetail
        konbit={k}
        communeName={communes[k.commune_slug] ?? k.commune_slug}
      />
      <h2
        id="repons"
        className="scroll-mt-16 px-4 pt-5 pb-1 text-sm font-bold uppercase tracking-wide text-stone-500"
      >
        Repons ({replies.length})
      </h2>
      {replies.map((r) => {
        const name = displayName(
          r.author?.display_name ?? null,
          r.author?.pseudo ?? null,
        );
        return (
          <div
            key={r.id}
            className="flex gap-3 border-b border-stone-100 px-4 py-3"
          >
            <Avatar
              name={name}
              avatarPath={r.author?.avatar_path ?? null}
              seed={r.author?.pseudo ?? String(r.id)}
              size={36}
            />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-bold">{name}</span>{" "}
                <span className="text-stone-500">
                  · <TimeAgo iso={r.created_at} />
                </span>
              </p>
              <p className="mt-1 whitespace-pre-line text-[15px] text-stone-900">
                {r.body}
              </p>
            </div>
          </div>
        );
      })}
      <div className="px-4 py-8 text-center">
        <p className="mb-4 text-stone-600">
          Pou kounye a, se nan aplikasyon an ou ka reponn. Repons sou sit la ap
          vini byento.
        </p>
        <AppButton />
      </div>
    </>
  );
}
