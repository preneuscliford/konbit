import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import BusinessMenu from "@/components/business/BusinessMenu";
import BusinessSocial from "@/components/business/BusinessSocial";
import Catalog from "@/components/business/Catalog";
import { StoreIcon, VerifiedIcon } from "@/components/Icons";
import PageHeader from "@/components/shell/PageHeader";
import { ProfileSkeleton } from "@/components/Skeleton";
import { categoryLabel, telUrl, whatsappUrl } from "@/lib/business";
import {
  getBusiness,
  getBusinessItems,
  getBusinessSlugs,
  getCommuneNames,
  getProfileById,
} from "@/lib/data";
import { displayName, excerpt } from "@/lib/site";
import { mediaUrl } from "@/lib/storage";

export async function generateStaticParams() {
  const slugs = await getBusinessSlugs(50);
  return slugs.length
    ? slugs.map(({ slug }) => ({ slug }))
    : [{ slug: "konbit" }];
}

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]">): Promise<Metadata> {
  const b = await getBusiness((await params).slug);
  if (!b) return { title: "Biznis pa jwenn", robots: { index: false } };
  const communes = await getCommuneNames();
  const where = communes[b.commune_slug] ?? b.commune_slug;
  const description = b.description
    ? excerpt(b.description)
    : `${b.name} · ${categoryLabel(b.category)} nan ${where}. Kontak ak katalòg sou Konbit 509.`;
  const image = b.cover_path ?? b.logo_path;
  return {
    title: `${b.name} · ${categoryLabel(b.category)}, ${where}`,
    description,
    alternates: { canonical: `/b/${b.slug}` },
    openGraph: {
      type: "website",
      title: `${b.name} sou Konbit 509`,
      description,
      images: image ? [{ url: mediaUrl(image) }] : undefined,
    },
  };
}

export default function BusinessPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Biznis" back />
          <ProfileSkeleton />
        </>
      }
    >
      <BusinessView params={params} />
    </Suspense>
  );
}

async function BusinessView({
  params,
}: {
  params: PageProps<"/b/[slug]">["params"];
}) {
  const b = await getBusiness((await params).slug);
  if (!b) notFound();
  const [items, communes, owner] = await Promise.all([
    getBusinessItems(b.id, b.slug),
    getCommuneNames(),
    getProfileById(b.owner_id),
  ]);
  const where = communes[b.commune_slug] ?? b.commune_slug;
  const greeting = `Bonjou ${b.name}, mwen wè biznis ou sou Konbit 509.`;
  const ownerName = owner
    ? displayName(owner.display_name, owner.pseudo)
    : null;

  // Données structurées pour Google (fiche d'entreprise locale).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: b.name,
    description: b.description ?? undefined,
    image: b.logo_path ? mediaUrl(b.logo_path) : undefined,
    telephone: b.phone ?? b.whatsapp ?? undefined,
    email: b.email ?? undefined,
    url: b.website ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address ?? undefined,
      addressLocality: where,
      addressCountry: "HT",
    },
  };

  return (
    <>
      <PageHeader
        title={b.name}
        subtitle={`${categoryLabel(b.category)} · ${where}`}
        back
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="relative aspect-[3/1] bg-brand">
        {b.cover_path && (
          <Image
            src={mediaUrl(b.cover_path)}
            alt=""
            fill
            sizes="600px"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="px-4 pb-5">
        <div className="flex items-end justify-between gap-3">
          <div className="relative z-10 -mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-surface bg-surface shadow-sm">
            {b.logo_path ? (
              <Image
                src={mediaUrl(b.logo_path)}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <StoreIcon className="h-10 w-10 text-brand" />
            )}
          </div>
          <div className="pt-3">
            <BusinessMenu
              businessId={b.id}
              ownerId={b.owner_id}
              name={b.name}
            />
          </div>
        </div>

        <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-extrabold text-stone-900">
          {b.name}
          {b.verified && (
            <span
              title="Biznis verifye pa ekip Konbit 509"
              className="text-brand"
            >
              <VerifiedIcon className="h-6 w-6" />
              <span className="sr-only">Verifye</span>
            </span>
          )}
        </h1>
        <p className="text-stone-500">
          {categoryLabel(b.category)} · {where}
        </p>

        {b.description && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-800">
            {b.description}
          </p>
        )}

        <BusinessSocial business={b} />

        {(b.whatsapp || b.phone) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {b.whatsapp && (
              <a
                href={whatsappUrl(b.whatsapp, greeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[#25D366] px-5 py-2.5 font-bold text-white hover:opacity-90"
              >
                WhatsApp
              </a>
            )}
            {b.phone && (
              <a
                href={telUrl(b.phone)}
                className="rounded-full bg-brand px-5 py-2.5 font-bold text-white hover:opacity-90"
              >
                Rele
              </a>
            )}
          </div>
        )}

        <dl className="mt-5 space-y-2 text-[15px]">
          {b.address && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-stone-500">Adrès</dt>
              <dd className="text-stone-800">{b.address}</dd>
            </div>
          )}
          {b.hours && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-stone-500">Lè</dt>
              <dd className="text-stone-800">{b.hours}</dd>
            </div>
          )}
          {b.email && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-stone-500">Imèl</dt>
              <dd>
                <a
                  href={`mailto:${b.email}`}
                  className="text-brand hover:underline"
                >
                  {b.email}
                </a>
              </dd>
            </div>
          )}
          {b.website && (
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-stone-500">Sit wèb</dt>
              <dd className="min-w-0 truncate">
                <a
                  href={b.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-brand hover:underline"
                >
                  {b.website.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {owner?.pseudo && ownerName && (
          <Link
            href={`/u/${owner.pseudo}`}
            className="mt-5 flex items-center gap-3 rounded-2xl border border-stone-200 p-3 hover:bg-stone-50"
          >
            <Avatar
              name={ownerName}
              avatarPath={owner.avatar_path}
              seed={owner.id}
              size={40}
            />
            <span className="min-w-0">
              <span className="block text-xs text-stone-500">Responsab</span>
              <span className="block truncate font-bold text-stone-900">
                {ownerName}{" "}
                <span className="font-normal text-stone-500">
                  @{owner.pseudo}
                </span>
              </span>
            </span>
          </Link>
        )}
      </div>

      <Catalog business={b} initial={items} />
    </>
  );
}
