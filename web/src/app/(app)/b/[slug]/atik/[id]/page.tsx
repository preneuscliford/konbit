import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ItemActions from "@/components/business/ItemActions";
import { StoreIcon, VerifiedIcon } from "@/components/Icons";
import SwipeGallery from "@/components/media/SwipeGallery";
import PageHeader from "@/components/shell/PageHeader";
import { ProfileSkeleton } from "@/components/Skeleton";
import { formatPrice } from "@/lib/business";
import {
  getBusiness,
  getBusinessItem,
  getBusinessItems,
  getBusinessSlugs,
} from "@/lib/data";
import { excerpt } from "@/lib/site";
import { mediaUrl } from "@/lib/storage";

export async function generateStaticParams() {
  const slugs = await getBusinessSlugs(20);
  const params: { slug: string; id: string }[] = [];
  for (const { slug } of slugs) {
    const b = await getBusiness(slug);
    if (!b) continue;
    const items = await getBusinessItems(b.id, b.slug);
    for (const item of items.slice(0, 20))
      params.push({ slug, id: String(item.id) });
  }
  return params.length ? params : [{ slug: "konbit509", id: "1" }];
}

async function load(params: PageProps<"/b/[slug]/atik/[id]">["params"]) {
  const { slug, id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId) || itemId <= 0) return null;
  const business = await getBusiness(slug);
  if (!business) return null;
  const item = await getBusinessItem(business.id, business.slug, itemId);
  return item ? { business, item } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/b/[slug]/atik/[id]">): Promise<Metadata> {
  const found = await load(params);
  if (!found) return { title: "Atik pa jwenn", robots: { index: false } };
  const { business: b, item } = found;
  const description = item.description
    ? excerpt(item.description)
    : `${item.name} · ${b.name} sou Konbit 509.`;
  const photo = item.photos[0];
  return {
    title: `${item.name} · ${b.name}`,
    description,
    alternates: { canonical: `/b/${b.slug}/atik/${item.id}` },
    openGraph: {
      type: "website",
      title: `${item.name} · ${b.name}`,
      description,
      images: photo ? [{ url: mediaUrl(photo.path) }] : undefined,
    },
  };
}

export default function ItemPage({ params }: PageProps<"/b/[slug]/atik/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Atik" back />
          <ProfileSkeleton />
        </>
      }
    >
      <ItemView params={params} />
    </Suspense>
  );
}

// Un produit ou un service en entier : toutes ses photos (glisser, plein
// écran), sa description complète, son prix, J'aime, partage et WhatsApp.
async function ItemView({
  params,
}: {
  params: PageProps<"/b/[slug]/atik/[id]">["params"];
}) {
  const found = await load(params);
  if (!found) notFound();
  const { business: b, item } = found;
  const contact = b.whatsapp || b.phone;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": item.kind === "service" ? "Service" : "Product",
    name: item.name,
    description: item.description ?? undefined,
    image: item.photos.map((p) => mediaUrl(p.path)),
    ...(item.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: item.price,
            priceCurrency: item.currency,
            availability: item.available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  };

  return (
    <>
      <PageHeader title={item.name} subtitle={b.name} back />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      {item.photos.length > 0 ? (
        <SwipeGallery
          className="aspect-square w-full bg-stone-100"
          sizes="(max-width: 640px) 100vw, 600px"
          images={item.photos.map((p) => ({
            src: mediaUrl(p.path),
            width: p.width,
            height: p.height,
          }))}
        />
      ) : (
        <div
          className="flex aspect-[2/1] items-center justify-center bg-stone-100 text-6xl text-stone-300"
          aria-hidden
        >
          {item.kind === "service" ? "✦" : "▢"}
        </div>
      )}

      <div className="px-4 pb-10 pt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          {item.kind === "service" ? "Sèvis" : "Pwodui"}
          {!item.available && (
            <span className="ml-2 text-brand-red">· Pa disponib</span>
          )}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-stone-900">
          {item.name}
        </h1>
        <p className="mt-2 text-xl font-extrabold text-brand">
          {formatPrice(item.price, item.currency)}
        </p>
        {item.description && (
          <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-stone-800">
            {item.description}
          </p>
        )}

        <ItemActions
          itemId={item.id}
          name={item.name}
          likeCount={item.like_count ?? 0}
          ownerId={b.owner_id}
          businessId={b.id}
          businessSlug={b.slug}
          contact={contact}
        />

        <Link
          href={`/b/${b.slug}`}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-stone-200 p-3 hover:bg-stone-50"
        >
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
            {b.logo_path ? (
              <Image
                src={mediaUrl(b.logo_path)}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <StoreIcon className="h-5 w-5 text-brand" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 font-bold text-stone-900">
              <span className="truncate">{b.name}</span>
              {b.verified && (
                <VerifiedIcon className="h-4 w-4 shrink-0 text-brand" />
              )}
            </span>
            <span className="block text-sm text-stone-500">
              Wè tout katalòg la
            </span>
          </span>
          <span className="text-stone-400">›</span>
        </Link>
      </div>
    </>
  );
}
