"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { refreshBusiness } from "@/app/actions/business";
import { useAuth } from "@/components/auth/AuthProvider";
import SwipeGallery from "@/components/media/SwipeGallery";
import { toast } from "@/components/Toaster";
import {
  formatPrice,
  whatsappUrl,
  type Business,
  type BusinessItem,
} from "@/lib/business";
import {
  businessErrorMessage,
  deleteItem,
  fetchMyItems,
} from "@/lib/business-actions";
import {
  fetchItemViewStats,
  fetchMyItemLikes,
  recordItemView,
  type ItemViewStats,
} from "@/lib/item-social";
import { mediaUrl } from "@/lib/storage";
import ItemLike from "./ItemLike";
import ShareButton from "./ShareButton";
import { useSeen } from "./useSeen";
import ItemEditor from "./ItemEditor";

// Katalòg d'une fiche. Le propriétaire voit en plus les boutons pour
// ajouter, modifier et retirer des articles.
export default function Catalog({
  business,
  initial,
}: {
  business: Business;
  initial: BusinessItem[];
}) {
  const { userId } = useAuth();
  const isOwner = !!userId && userId === business.owner_id;
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<BusinessItem | "new" | null>(null);

  // Propriétaire : sa liste complète (articles masqués compris), sans cache.
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    fetchMyItems(business.id)
      .then((list) => !cancelled && setItems(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner, business.id]);

  async function remove(item: BusinessItem) {
    if (!window.confirm(`Retire « ${item.name} » nan katalòg la?`)) return;
    try {
      await deleteItem(item);
      setItems((list) => list.filter((i) => i.id !== item.id));
      await refreshBusiness([business.slug]);
      toast("Atik la retire.");
    } catch (e) {
      toast(businessErrorMessage(e), "error");
    }
  }

  // J'aime de l'utilisateur ; vues de chaque article pour le propriétaire.
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState<Map<number, ItemViewStats> | null>(null);
  const ids = items.map((i) => i.id).join(",");
  useEffect(() => {
    if (!userId || !ids) return;
    let cancelled = false;
    fetchMyItemLikes(userId, ids.split(",").map(Number))
      .then((set) => !cancelled && setLiked(set))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, ids]);
  useEffect(() => {
    if (!isOwner) return;
    let cancelled = false;
    fetchItemViewStats(business.id)
      .then((m) => !cancelled && setStats(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOwner, business.id]);

  const contact = business.whatsapp || business.phone;

  return (
    <section id="katalog" className="border-t border-stone-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-extrabold text-stone-900">
          Katalòg{" "}
          {items.length > 0 && (
            <span className="font-medium text-stone-500">({items.length})</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {/* Partager tout le katalòg : visible pour tout le monde. */}
          {items.length > 0 && (
            <ShareButton
              path={`/b/${business.slug}#katalog`}
              title={`Katalòg ${business.name}`}
              label="Pataje"
            />
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              + Ajoute yon atik
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-4 pb-10 pt-4 text-center text-stone-500">
          {isOwner
            ? "Katalòg ou vid. Ajoute pwodui oswa sèvis ou yo pou moun wè sa w ofri."
            : "Poko gen atik nan katalòg la."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-6 sm:gap-4">
          {items.map((item) => (
            <CatalogCard
              key={item.id}
              item={item}
              slug={business.slug}
              isOwner={isOwner}
              liked={liked.has(item.id)}
              stats={stats?.get(item.id) ?? null}
              contact={contact}
              onEdit={() => setEditing(item)}
              onRemove={() => void remove(item)}
            />
          ))}
        </div>
      )}

      {isOwner && (
        <p className="px-4 pb-6 text-center text-sm">
          <Link
            href="/biznis/fich"
            className="font-semibold text-brand hover:underline"
          >
            Modifye enfòmasyon fich la
          </Link>
        </p>
      )}

      {editing && userId && (
        <ItemEditor
          businessId={business.id}
          userId={userId}
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems((list) =>
              list.some((i) => i.id === saved.id)
                ? list.map((i) => (i.id === saved.id ? saved : i))
                : [...list, saved],
            );
            setEditing(null);
            void refreshBusiness([business.slug]);
            toast("Atik la anrejistre.");
          }}
        />
      )}
    </section>
  );
}

// Carte d'un article : un toucher ouvre sa page ; comptée comme vue quand elle
// reste visible au moins à moitié pendant 1 s (pas pour le propriétaire).
function CatalogCard({
  item,
  slug,
  isOwner,
  liked,
  stats,
  contact,
  onEdit,
  onRemove,
}: {
  item: BusinessItem;
  slug: string;
  isOwner: boolean;
  liked: boolean;
  stats: ItemViewStats | null;
  contact: string | null;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const href = `/b/${slug}/atik/${item.id}`;
  useSeen(ref, () => recordItemView(item.id), !isOwner);

  return (
    <article
      ref={ref}
      className={`flex flex-col overflow-hidden rounded-2xl border border-stone-200 ${item.available ? "" : "opacity-60"}`}
    >
      <div className="relative aspect-square bg-stone-100">
        {item.photos.length > 0 ? (
          <SwipeGallery
            className="h-full w-full"
            sizes="(max-width: 640px) 45vw, 280px"
            href={href}
            images={item.photos.map((p) => ({
              src: mediaUrl(p.path),
              width: p.width,
              height: p.height,
            }))}
          />
        ) : (
          <Link
            href={href}
            className="flex h-full items-center justify-center text-3xl text-stone-300"
            aria-label={item.name}
          >
            {item.kind === "service" ? "✦" : "▢"}
          </Link>
        )}
        {!item.available && (
          <span className="absolute left-2 top-2 rounded-md bg-stone-900/80 px-2 py-0.5 text-[11px] font-bold text-white">
            Pa disponib
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <Link href={href} className="block">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
            {item.kind === "service" ? "Sèvis" : "Pwodui"}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-bold leading-snug text-stone-900 hover:underline">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-3 text-sm text-stone-600">
              {item.description}
            </p>
          )}
          <p className="mt-2 font-extrabold text-brand">
            {formatPrice(item.price, item.currency)}
          </p>
        </Link>
        <div className="-ml-1.5 mt-1 flex items-center justify-between">
          <div className="flex items-center">
            <ItemLike
              itemId={item.id}
              count={item.like_count ?? 0}
              liked={liked}
            />
            <ShareButton path={href} title={item.name} />
          </div>
          {isOwner && stats && (
            <span
              className="text-xs text-stone-500"
              title="Moun diferan ki wè l (yon fwa pa jou)"
            >
              👁 {stats.total} · {stats.week} sa 7 j
            </span>
          )}
        </div>
        <div className="mt-auto pt-2">
          {isOwner ? (
            <div className="flex gap-2 text-sm font-semibold">
              <button
                type="button"
                onClick={onEdit}
                className="text-brand hover:underline"
              >
                Modifye
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-brand-red hover:underline"
              >
                Retire
              </button>
            </div>
          ) : (
            contact && (
              <a
                href={whatsappUrl(
                  contact,
                  `Bonjou, mwen wè « ${item.name} » sou Konbit 509. Èske l disponib?`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full bg-[#25D366] px-3 py-2 text-center text-sm font-bold text-white hover:opacity-90"
              >
                Mande sou WhatsApp
              </a>
            )
          )}
        </div>
      </div>
    </article>
  );
}
