"use server";

import { updateTag } from "next/cache";
import { SLUG_PATTERN } from "@/lib/business";

// Après une modification faite par le propriétaire (dans son navigateur, avec
// sa session), on vide le cache de la fiche et de l'annuaire pour qu'il voie
// tout de suite le résultat. Ne fait que forcer une relecture : sans risque.
export async function refreshBusiness(slugs: string[]) {
  updateTag("businesses");
  for (const slug of slugs.slice(0, 2)) {
    if (SLUG_PATTERN.test(slug)) updateTag(`business:${slug}`);
  }
}
