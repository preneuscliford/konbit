"use server";

import { updateTag } from "next/cache";

// Après une action dans un konbit (message, réponse, inscription), on vide son
// cache pour que la page rechargée montre tout de suite le résultat.
export async function refreshKonbit(id: number) {
  if (Number.isInteger(id) && id > 0) updateTag(`konbit:${id}`);
}

// Nouveau konbit ou message : le fil et l'accueil le montrent tout de suite.
export async function refreshFeed() {
  updateTag("feed");
}
