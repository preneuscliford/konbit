"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { Konbit } from "@/lib/data";
import { fetchMyState } from "@/lib/konbit-actions";
import KonbitPost from "./KonbitPost";

// Konbit seul (sa page) : rendu par le serveur, puis complété avec le
// J'aime et le « Mwen ladan » de l'utilisateur connecté.
export default function KonbitDetail({
  konbit,
  communeName,
}: {
  konbit: Konbit;
  communeName: string;
}) {
  const { ready, userId } = useAuth();
  const [k, setK] = useState(konbit);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    fetchMyState(userId, [konbit.id])
      .then(({ liked, joined }) => {
        if (!cancelled)
          setK({
            ...konbit,
            liked: liked.has(konbit.id),
            joined: joined.has(konbit.id),
          });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, userId, konbit]);

  return <KonbitPost konbit={k} communeName={communeName} full />;
}
