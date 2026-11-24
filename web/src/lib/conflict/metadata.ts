import type { Metadata } from "next";
import { LANG_PATH, UI, type Lang } from "./i18n";

// Métadonnées de la carte du conflit dans chaque langue (page publique,
// indexée ; un bandeau d'avertissement s'affiche sur la carte).

export function conflictMetadata(lang: Lang): Metadata {
  return {
    title: UI.title[lang],
    description: UI.description[lang],
    alternates: {
      canonical: LANG_PATH[lang],
      languages: { ht: LANG_PATH.ht, fr: LANG_PATH.fr, en: LANG_PATH.en, "x-default": LANG_PATH.ht },
    },
    openGraph: {
      title: UI.title[lang],
      description: UI.description[lang],
      locale: { ht: "ht_HT", fr: "fr_FR", en: "en_US" }[lang],
    },
  };
}
