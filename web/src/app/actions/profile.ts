"use server";

import { updateTag } from "next/cache";

const PSEUDO = /^[A-Za-z0-9_]{3,20}$/;

// Après une modification du profil ou un abonnement, on vide le cache des
// pages de profil concernées (relecture seulement : sans risque).
export async function refreshProfiles(pseudos: string[]) {
  for (const pseudo of pseudos.slice(0, 3)) {
    if (PSEUDO.test(pseudo)) updateTag(`profile:${pseudo.toLowerCase()}`);
  }
}
