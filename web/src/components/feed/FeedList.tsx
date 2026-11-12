"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { KonbitSkeleton } from "@/components/Skeleton";
import type { Konbit } from "@/lib/data";
import {
  FEED_PAGE_SIZE,
  fetchFeedPage,
  fetchMyState,
  konbitErrorMessage,
} from "@/lib/konbit-actions";
import KonbitPost from "./KonbitPost";

const cursorOf = (k: Konbit) => ({ createdAt: k.created_at, id: k.id });
export const cursorParam = (k: Konbit) =>
  encodeURIComponent(`${k.created_at}~${k.id}`);

// Fil à défilement continu. La première page vient du serveur (rapide, lue
// par Google) ; la suite se charge en arrivant en bas. Le lien « Wè plis »
// reste dans la page pour les moteurs de recherche et sans JavaScript.
export default function FeedList({
  initial,
  communes,
  authorId,
  basePath,
  emptyText = "Poko gen konbit. Lanse premye a!",
}: {
  initial: Konbit[];
  communes: Record<string, string>;
  authorId?: string;
  basePath: string;
  emptyText?: string;
}) {
  const { userId, ready } = useAuth();
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length < FEED_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLAnchorElement>(null);
  const loadingRef = useRef(false);

  // Connecté : on complète J'aime et « Mwen ladan » des konbits venus du serveur.
  const mergedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !userId || mergedFor.current === userId) return;
    mergedFor.current = userId;
    const ids = initial.map((k) => k.id);
    fetchMyState(userId, ids)
      .then(({ liked, joined }) =>
        setItems((list) =>
          list.map((k) =>
            ids.includes(k.id)
              ? { ...k, liked: liked.has(k.id), joined: joined.has(k.id) }
              : k,
          ),
        ),
      )
      .catch(() => {});
  }, [ready, userId, initial]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done || items.length === 0) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchFeedPage(
        cursorOf(items[items.length - 1]),
        authorId,
      );
      setItems((list) => {
        const seen = new Set(list.map((k) => k.id));
        return [...list, ...page.filter((k) => !seen.has(k.id))];
      });
      if (page.length < FEED_PAGE_SIZE) setDone(true);
    } catch (e) {
      setError(konbitErrorMessage(e));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [done, items, authorId]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || error) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && void loadMore(),
      {
        rootMargin: "600px 0px",
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, done, error]);

  if (items.length === 0) {
    return <p className="px-4 py-16 text-center text-stone-500">{emptyText}</p>;
  }

  const last = items[items.length - 1];

  return (
    <>
      {items.map((k) => (
        <KonbitPost
          key={k.id}
          konbit={k}
          communeName={communes[k.commune_slug] ?? k.commune_slug}
          onDeleted={(id) =>
            setItems((list) => list.filter((x) => x.id !== id))
          }
        />
      ))}

      {loading && (
        <>
          <KonbitSkeleton />
          <KonbitSkeleton />
        </>
      )}

      {error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-stone-500">{error}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="mt-3 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white"
          >
            Eseye ankò
          </button>
        </div>
      ) : done ? (
        <p className="px-4 py-10 text-center text-sm text-stone-400">
          Ou rive nan bout lis la.
        </p>
      ) : (
        <Link
          ref={sentinel}
          href={`${basePath}?apre=${cursorParam(last)}`}
          onClick={(e) => {
            e.preventDefault();
            void loadMore();
          }}
          className="block py-6 text-center text-sm font-semibold text-brand hover:underline"
        >
          Wè plis konbit
        </Link>
      )}
    </>
  );
}
