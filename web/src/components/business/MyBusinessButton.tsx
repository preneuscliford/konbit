"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { fetchMyBusiness } from "@/lib/business-actions";

// En haut de l'annuaire : créer sa fiche, ou ouvrir celle qu'on a déjà.
export default function MyBusinessButton() {
  const { ready, userId } = useAuth();
  const [slug, setSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    fetchMyBusiness(userId)
      .then((b) => !cancelled && setSlug(b?.slug ?? null))
      .catch(() => !cancelled && setSlug(null));
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  const mine = userId ? slug : null;
  if (!ready || (userId && mine === undefined))
    return (
      <span className="h-10 w-36 animate-pulse rounded-full bg-stone-100" />
    );

  return (
    <Link
      href={
        mine
          ? `/b/${mine}`
          : userId
            ? "/biznis/fich"
            : "/konekte?next=%2Fbiznis%2Ffich"
      }
      className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
    >
      {mine ? "Fich mwen" : "+ Kreye fich ou"}
    </Link>
  );
}
