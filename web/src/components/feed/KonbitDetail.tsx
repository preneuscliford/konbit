"use client";

import { useEffect, useState } from "react";
import { refreshKonbit } from "@/app/actions/konbit";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Konbit } from "@/lib/data";
import { fetchMyState, type ThreadReply } from "@/lib/konbit-actions";
import KonbitPost from "./KonbitPost";
import Thread from "./Thread";

// Page d'un konbit : la publication (rendue par le serveur, puis complétée
// avec le J'aime et l'inscription de l'utilisateur), puis son espace de
// messages. Rejoindre le konbit ouvre aussitôt l'écriture.
export default function KonbitDetail({
  konbit,
  communeName,
  replies,
}: {
  konbit: Konbit;
  communeName: string;
  replies: ThreadReply[];
}) {
  const { ready, userId, canPost } = useAuth();
  const [k, setK] = useState(konbit);
  // Inscription changée sur cette page (sans recharger la publication).
  const [joinedNow, setJoinedNow] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    fetchMyState(userId, [konbit.id])
      .then(({ liked, joined, reposted }) => {
        if (!cancelled)
          setK({
            ...konbit,
            liked: liked.has(konbit.id),
            joined: joined.has(konbit.id),
            reposted: reposted.has(konbit.id),
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, userId, konbit]);

  const isKonbit = konbit.kind === "konbit";
  const joined = joinedNow ?? !!k.joined;
  const canWrite =
    canPost && (!isKonbit || konbit.author_id === userId || joined);

  return (
    <>
      <KonbitPost
        konbit={k}
        communeName={communeName}
        full
        onJoinChange={(on) => {
          setJoinedNow(on);
          void refreshKonbit(konbit.id);
        }}
      />
      <Thread
        konbitId={konbit.id}
        isKonbit={isKonbit}
        canWrite={canWrite}
        initial={replies}
      />
    </>
  );
}
