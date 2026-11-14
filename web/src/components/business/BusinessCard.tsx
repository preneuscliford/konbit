import Image from "next/image";
import Link from "next/link";
import { StoreIcon, VerifiedIcon } from "@/components/Icons";
import {
  BUSINESS_SOCIAL_ENABLED,
  categoryLabel,
  type Business,
} from "@/lib/business";
import { mediaUrl } from "@/lib/storage";
import BusinessSocial from "./BusinessSocial";

// Ligne d'une fiche dans l'annuaire, avec J'aime, repost et partage.
export default function BusinessCard({
  business: b,
  communeName,
}: {
  business: Business;
  communeName: string;
}) {
  return (
    <div
      className={`border-b border-stone-200 px-4 pt-3.5 hover:bg-stone-50/70 ${BUSINESS_SOCIAL_ENABLED ? "pb-1.5" : "pb-3.5"}`}
    >
      <Link href={`/b/${b.slug}`} className="flex gap-3">
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
          {b.logo_path ? (
            <Image
              src={mediaUrl(b.logo_path)}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <StoreIcon className="h-6 w-6 text-brand" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 font-bold text-stone-900">
            <span className="truncate">{b.name}</span>
            {b.verified && (
              <VerifiedIcon className="h-[18px] w-[18px] shrink-0 text-brand" />
            )}
          </span>
          <span className="block text-sm text-stone-500">
            {categoryLabel(b.category)} · {communeName}
          </span>
          {b.description && (
            <span className="mt-1 line-clamp-2 block text-sm text-stone-700">
              {b.description}
            </span>
          )}
        </span>
      </Link>
      {/* Sous le texte, aligné avec lui (après le logo). */}
      <div className="pl-[4.25rem]">
        <BusinessSocial business={b} className="-ml-2" />
      </div>
    </div>
  );
}
