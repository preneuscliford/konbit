"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { ShareIcon } from "@/components/Icons";
import { toast } from "@/components/Toaster";
import { whatsappUrl } from "@/lib/business";
import {
  fetchItemViewStats,
  fetchMyItemLikes,
  recordItemView,
  type ItemViewStats,
} from "@/lib/item-social";
import ItemLike from "./ItemLike";

// Page d'un article : la page ouverte compte comme une vue (sauf pour le
// propriétaire, qui voit à la place ses chiffres et le bouton « Modifye »).
export default function ItemActions({
  itemId,
  name,
  likeCount,
  ownerId,
  businessId,
  businessSlug,
  contact,
}: {
  itemId: number;
  name: string;
  likeCount: number;
  ownerId: string;
  businessId: number;
  businessSlug: string;
  contact: string | null;
}) {
  const { ready, userId } = useAuth();
  const isOwner = !!userId && userId === ownerId;
  const [liked, setLiked] = useState(false);
  const [stats, setStats] = useState<ItemViewStats | null>(null);

  useEffect(() => {
    if (!ready || isOwner) return;
    recordItemView(itemId);
  }, [ready, isOwner, itemId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMyItemLikes(userId, [itemId])
      .then((set) => !cancelled && setLiked(set.has(itemId)))
      .catch(() => {});
    if (isOwner) {
      fetchItemViewStats(businessId)
        .then(
          (m) => !cancelled && setStats(m.get(itemId) ?? { total: 0, week: 0 }),
        )
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [userId, isOwner, itemId, businessId]);

  async function share() {
    const url = `${window.location.origin}/b/${businessSlug}/atik/${itemId}`;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé.
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="-ml-2 flex items-center gap-4">
        <ItemLike
          itemId={itemId}
          count={likeCount}
          liked={!!userId && liked}
          size="lg"
        />
        <button
          type="button"
          onClick={share}
          aria-label="Pataje"
          className="group rounded-full p-2.5 text-stone-500 hover:bg-blue-50 hover:text-brand"
        >
          <ShareIcon className="h-6 w-6" />
        </button>
      </div>

      {isOwner ? (
        <div className="rounded-2xl border border-stone-200 p-4">
          <p className="text-sm font-semibold text-stone-700">
            Estatistik (ou sèl ki wè yo)
          </p>
          <p className="mt-1 text-stone-900">
            👁 <b>{stats?.total ?? "…"}</b> moun wè l ·{" "}
            <b>{stats?.week ?? "…"}</b> sa 7 dènye jou yo
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Yon moun konte yon fwa pa jou, lè li louvri paj la oswa lè kat la
            rete vizib 1 segonn.
          </p>
          <Link
            href={`/b/${businessSlug}#katalog`}
            className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Modifye atik la nan katalòg la
          </Link>
        </div>
      ) : (
        contact && (
          <a
            href={whatsappUrl(
              contact,
              `Bonjou, mwen wè « ${name} » sou Konbit 509. Èske l disponib?`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-full bg-[#25D366] px-5 py-3.5 text-center text-lg font-bold text-white hover:opacity-90"
          >
            Mande sou WhatsApp
          </a>
        )
      )}
    </div>
  );
}
