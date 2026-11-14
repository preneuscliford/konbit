import type { Konbit, KonbitOriginal } from "./data";

// Repost : petites fonctions utilisables côté navigateur comme côté serveur
// (data.ts contient des fonctions serveur en cache, interdites dans le navigateur).

// Repost simple : texte vide (l'original s'affiche à sa place).
export const isPlainRepost = (k: Pick<Konbit, "is_repost" | "body">) =>
  !!k.is_repost && !k.body.trim();

// Original d'un repost affiché comme une publication (actions sur l'original).
export function originalAsKonbit(o: KonbitOriginal, reposted: boolean): Konbit {
  return { ...o, repost_of: null, is_repost: false, reposted, original: null };
}
