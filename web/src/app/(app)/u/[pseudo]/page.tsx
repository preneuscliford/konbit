import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import FeedList from "@/components/feed/FeedList";
import PageHeader from "@/components/shell/PageHeader";
import BusinessCard from "@/components/business/BusinessCard";
import { ProfileSkeleton } from "@/components/Skeleton";
import {
  getBusinessByOwner,
  getCommuneNames,
  getKonbitsByAuthor,
  getProfile,
  getRecentPseudos,
  profileImageUrl,
} from "@/lib/data";
import { displayName, excerpt, formatDate } from "@/lib/site";

export async function generateStaticParams() {
  const pseudos = await getRecentPseudos(50);
  return pseudos.length
    ? pseudos.map((pseudo) => ({ pseudo }))
    : [{ pseudo: "konbit" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/u/[pseudo]">): Promise<Metadata> {
  const p = await getProfile((await params).pseudo);
  if (!p) return { title: "Kont pa jwenn" };
  const name = displayName(p.display_name, p.pseudo);
  const description = p.bio
    ? excerpt(p.bio)
    : `${name} (@${p.pseudo}) sou Konbit 509.`;
  return {
    title: `${name} (@${p.pseudo})`,
    description,
    alternates: { canonical: `/u/${p.pseudo}` },
    openGraph: {
      type: "profile",
      title: `${name} sou Konbit 509`,
      description,
      images: p.avatar_path
        ? [{ url: profileImageUrl(p.avatar_path) }]
        : undefined,
    },
  };
}

export default function ProfilePage({ params }: PageProps<"/u/[pseudo]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Pwofil" back />
          <ProfileSkeleton />
        </>
      }
    >
      <ProfileView params={params} />
    </Suspense>
  );
}

async function ProfileView({
  params,
}: {
  params: PageProps<"/u/[pseudo]">["params"];
}) {
  const p = await getProfile((await params).pseudo);
  if (!p) notFound();
  const [konbits, communes, business] = await Promise.all([
    getKonbitsByAuthor(p.id),
    getCommuneNames(),
    getBusinessByOwner(p.id),
  ]);
  const name = displayName(p.display_name, p.pseudo);

  return (
    <>
      <PageHeader
        title={name}
        subtitle={`${konbits.length}${konbits.length >= 20 ? "+" : ""} konbit`}
        back
      />
      <div className="relative h-36 bg-brand sm:h-44">
        {p.cover_path && (
          <Image
            src={profileImageUrl(p.cover_path)}
            alt=""
            fill
            sizes="672px"
            className="object-cover"
            priority
          />
        )}
      </div>
      <div className="px-4 pb-4">
        <div className="relative z-10 -mt-10 mb-3 inline-block rounded-full border-4 border-surface bg-surface">
          <Avatar
            name={name}
            avatarPath={p.avatar_path}
            seed={p.id}
            size={80}
          />
        </div>
        <h1 className="text-2xl font-extrabold">{name}</h1>
        <p className="text-stone-500">@{p.pseudo}</p>
        {p.bio && (
          <p className="mt-3 whitespace-pre-line text-stone-800">{p.bio}</p>
        )}
        <p className="mt-3 text-sm text-stone-500">
          {p.commune_slug && `${communes[p.commune_slug] ?? p.commune_slug} · `}
          Manm depi {formatDate(p.created_at)}
        </p>
        <p className="mt-2 text-sm">
          <b>{p.following_count}</b>{" "}
          <span className="text-stone-500">ap swiv</span> ·{" "}
          <b>{p.followers_count}</b>{" "}
          <span className="text-stone-500">abòne</span>
        </p>
      </div>
      {business && (
        <section className="border-t border-stone-200">
          <h2 className="px-4 pt-3 text-[15px] font-bold text-stone-900">
            Biznis
          </h2>
          <BusinessCard
            business={business}
            communeName={
              communes[business.commune_slug] ?? business.commune_slug
            }
          />
        </section>
      )}
      <h2 className="border-b border-t border-stone-200 px-4 py-3 text-[15px] font-bold text-stone-900">
        Konbit
      </h2>
      <FeedList
        initial={konbits}
        communes={communes}
        authorId={p.id}
        basePath={`/u/${p.pseudo}`}
        emptyText="Poko gen konbit."
      />
    </>
  );
}
