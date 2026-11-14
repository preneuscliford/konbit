"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  HeartIcon,
  RepostIcon,
  ShareIcon,
  StoreIcon,
} from "@/components/Icons";
import { toast } from "@/components/Toaster";
import {
  BUSINESS_SOCIAL_ENABLED,
  categoryLabel,
  type FeedBusiness,
} from "@/lib/business";
import {
  konbitErrorMessage,
  repostBusiness,
  setBusinessLike,
  undoBusinessRepost,
} from "@/lib/konbit-actions";
import { mediaUrl } from "@/lib/storage";
import RepostMenu from "./RepostMenu";
import { useRequireAccount } from "./useRequireAccount";

// Fiche business reprise dans le fil : en citation (sous une légende) ou en
// repost simple (avec J'aime, repost et partage de la fiche).

type SocialBusiness = Pick<
  FeedBusiness,
  | "id"
  | "slug"
  | "name"
  | "commune_slug"
  | "like_count"
  | "repost_count"
  | "liked"
  | "reposted"
>;

function BusinessSummary({
  business: b,
  disabled = false,
}: {
  business: FeedBusiness;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {b.cover_path && (
        <span className="relative block aspect-[3/1] w-full bg-stone-100">
          <Image
            src={mediaUrl(b.cover_path)}
            alt=""
            fill
            sizes="520px"
            className="object-cover"
          />
        </span>
      )}
      <span className="flex items-center gap-3 px-3.5 py-3">
        {b.logo_path ? (
          <Image
            src={mediaUrl(b.logo_path)}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand">
            <StoreIcon className="h-5 w-5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-stone-900">
            {b.name} {b.verified && <span title="Verifye">✅</span>}
          </span>
          <span className="block truncate text-[13px] text-stone-500">
            Biznis · {categoryLabel(b.category)}
          </span>
          {b.description && (
            <span className="mt-0.5 line-clamp-2 block text-sm text-stone-700">
              {b.description}
            </span>
          )}
        </span>
      </span>
    </>
  );
  const box = "mt-2 block overflow-hidden rounded-2xl border border-stone-200";
  return disabled ? (
    <div className={box}>{inner}</div>
  ) : (
    <Link href={`/b/${b.slug}`} className={`${box} hover:bg-stone-50`}>
      {inner}
    </Link>
  );
}

const Unavailable = () => (
  <p className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
    Fich biznis sa a pa disponib ankò.
  </p>
);

// Sous une légende (« Site ») ou en aperçu dans l'écran de publication.
export function QuotedBusiness({
  business,
  disabled = false,
}: {
  business: FeedBusiness | null;
  disabled?: boolean;
}) {
  if (!business) return <Unavailable />;
  return <BusinessSummary business={business} disabled={disabled} />;
}

// Repost simple d'une fiche : la fiche avec ses actions.
export default function BusinessFeedCard({
  business,
}: {
  business: FeedBusiness | null;
}) {
  return (
    <div className="px-4 pb-3 pl-[3.25rem]">
      {business ? (
        <>
          <BusinessSummary business={business} />
          <BusinessSocialBar business={business} />
        </>
      ) : (
        <Unavailable />
      )}
    </div>
  );
}

// J'aime, repost (« Reposte » / « Site ») et partage d'une fiche : dans le fil
// et sur la page de la fiche.
// Désactivé pour l'instant (BUSINESS_SOCIAL_ENABLED) : rien ne s'affiche.
export function BusinessSocialBar(props: {
  business: SocialBusiness;
  className?: string;
}) {
  if (!BUSINESS_SOCIAL_ENABLED) return null;
  return <BusinessSocialBarInner {...props} />;
}

function BusinessSocialBarInner({
  business: initial,
  className = "mt-1",
}: {
  business: SocialBusiness;
  className?: string;
}) {
  const router = useRouter();
  const { userId } = useAuth();
  const requireAccount = useRequireAccount();
  const [b, setB] = useState(initial);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  // Nouvel état venu du parent (J'aime et repost chargés après coup).
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setB(initial);
  }

  function toggleLike() {
    requireAccount(async (me) => {
      if (busy) return;
      setBusy(true);
      const on = !b.liked;
      setB((c) => ({
        ...c,
        liked: on,
        like_count: Math.max(0, c.like_count + (on ? 1 : -1)),
      }));
      try {
        await setBusinessLike(b.id, on, me);
      } catch (e) {
        setB((c) => ({
          ...c,
          liked: !on,
          like_count: Math.max(0, c.like_count + (on ? -1 : 1)),
        }));
        toast(konbitErrorMessage(e), "error");
      } finally {
        setBusy(false);
      }
    });
  }

  async function toggleRepost() {
    setMenu(false);
    if (!userId) return;
    const on = !b.reposted;
    setB((c) => ({
      ...c,
      reposted: on,
      repost_count: Math.max(0, c.repost_count + (on ? 1 : -1)),
    }));
    try {
      if (on) await repostBusiness(b);
      else await undoBusinessRepost(b.id, userId);
      toast(on ? "Ou reposte fich la." : "Repost la anile.");
      router.refresh();
    } catch (e) {
      setB((c) => ({
        ...c,
        reposted: !on,
        repost_count: Math.max(0, c.repost_count + (on ? -1 : 1)),
      }));
      toast(konbitErrorMessage(e), "error");
    }
  }

  async function share() {
    const url = `${window.location.origin}/b/${b.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: b.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé.
    }
  }

  const action =
    "group flex items-center gap-1.5 rounded-full text-[13px] text-stone-500 transition";

  return (
    <div className={`flex max-w-xs items-center justify-between ${className}`}>
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={b.liked}
        aria-label={`Renmen: ${b.like_count}`}
        className={`${action} ${b.liked ? "text-brand-red" : "hover:text-brand-red"}`}
      >
        <span className="rounded-full p-2 group-hover:bg-red-50">
          <HeartIcon className="h-[18px] w-[18px]" filled={b.liked} />
        </span>
        {b.like_count > 0 && b.like_count}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => requireAccount(() => setMenu((o) => !o))}
          aria-label={`Reposte: ${b.repost_count}`}
          aria-haspopup="menu"
          aria-expanded={menu}
          className={`${action} ${b.reposted ? "text-emerald-700" : "hover:text-emerald-700"}`}
        >
          <span className="rounded-full p-2 group-hover:bg-emerald-50">
            <RepostIcon className="h-[18px] w-[18px]" />
          </span>
          {b.repost_count > 0 && b.repost_count}
        </button>
        {menu && (
          <RepostMenu
            reposted={b.reposted}
            onClose={() => setMenu(false)}
            onRepost={() => void toggleRepost()}
            onQuote={() => router.push(`/lanse?biznis=${b.id}`)}
          />
        )}
      </div>

      <button
        type="button"
        onClick={share}
        aria-label="Pataje"
        className={`${action} hover:text-brand`}
      >
        <span className="rounded-full p-2 group-hover:bg-blue-50">
          <ShareIcon className="h-[18px] w-[18px]" />
        </span>
      </button>
    </div>
  );
}
