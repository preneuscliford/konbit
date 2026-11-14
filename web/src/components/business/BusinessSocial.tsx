"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BusinessSocialBar } from "@/components/feed/BusinessFeedCard";
import { BUSINESS_SOCIAL_ENABLED } from "@/lib/business";
import { fetchMyBusinessState } from "@/lib/konbit-actions";

type MyState = { liked: Set<number>; reposted: Set<number> };

// Annuaire : l'état de l'utilisateur (J'aime, repost) pour toutes les fiches
// de la liste, chargé en une fois au lieu d'une requête par fiche.
const ListState = createContext<MyState | "loading" | null>(null);

export function BusinessSocialProvider({
  ids,
  children,
}: {
  ids: number[];
  children: React.ReactNode;
}) {
  const { userId } = useAuth();
  const [state, setState] = useState<{ key: string; value: MyState } | null>(
    null,
  );
  const key = `${userId}:${ids.join(",")}`;

  useEffect(() => {
    if (!BUSINESS_SOCIAL_ENABLED || !userId || ids.length === 0) return;
    let cancelled = false;
    fetchMyBusinessState(userId, ids)
      .then(({ businessLiked, businessReposted }) => {
        if (!cancelled)
          setState({
            key: `${userId}:${ids.join(",")}`,
            value: { liked: businessLiked, reposted: businessReposted },
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, ids]);

  const value = state?.key === key ? state.value : "loading";
  return <ListState.Provider value={value}>{children}</ListState.Provider>;
}

const NONE = { liked: false, reposted: false };

// Barre J'aime / repost / partage d'une fiche (page de la fiche ou annuaire).
// Les pages viennent du cache (sans session) : l'état de l'utilisateur est
// chargé ici, ou par la liste (BusinessSocialProvider).
export default function BusinessSocial({
  business,
  className = "-ml-2 mt-3",
}: {
  business: {
    id: number;
    slug: string;
    name: string;
    commune_slug: string;
    like_count: number;
    repost_count: number;
  };
  className?: string;
}) {
  const { userId } = useAuth();
  const list = useContext(ListState);
  const [own, setOwn] = useState(NONE);

  useEffect(() => {
    // Dans une liste, c'est la liste qui charge l'état.
    if (!BUSINESS_SOCIAL_ENABLED || !userId || list !== null) return;
    let cancelled = false;
    fetchMyBusinessState(userId, [business.id])
      .then(({ businessLiked, businessReposted }) => {
        if (cancelled) return;
        setOwn({
          liked: businessLiked.has(business.id),
          reposted: businessReposted.has(business.id),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, business.id, list]);

  const liked = !userId
    ? false
    : list && list !== "loading"
      ? list.liked.has(business.id)
      : own.liked;
  const reposted = !userId
    ? false
    : list && list !== "loading"
      ? list.reposted.has(business.id)
      : own.reposted;

  // Objet stable : la barre se recale seulement quand l'état change vraiment.
  const value = useMemo(
    () => ({ ...business, liked, reposted }),
    [business, liked, reposted],
  );

  return <BusinessSocialBar business={value} className={className} />;
}
