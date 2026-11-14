"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { BusinessSocialBar } from "@/components/feed/BusinessFeedCard";
import { fetchMyBusinessState } from "@/lib/konbit-actions";

// Barre J'aime / repost / partage sur la page d'une fiche. La page vient du
// cache (sans session) : l'état de l'utilisateur est chargé ici.
export default function BusinessSocial({
  business,
}: {
  business: {
    id: number;
    slug: string;
    name: string;
    commune_slug: string;
    like_count: number;
    repost_count: number;
  };
}) {
  const { userId } = useAuth();
  const [mine, setMine] = useState({ liked: false, reposted: false });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMyBusinessState(userId, [business.id])
      .then(({ businessLiked, businessReposted }) => {
        if (cancelled) return;
        setMine({
          liked: businessLiked.has(business.id),
          reposted: businessReposted.has(business.id),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, business.id]);

  // Objet stable : la barre se recale seulement quand l'état change vraiment.
  // Déconnecté : rien n'est aimé ni reposté.
  const value = useMemo(
    () => ({
      ...business,
      ...(userId ? mine : { liked: false, reposted: false }),
    }),
    [business, userId, mine],
  );

  return <BusinessSocialBar business={value} className="-ml-2 mt-3" />;
}
