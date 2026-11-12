// Réglages et textes du site public (kreyòl d'abord, comme l'app).

// Adresse publique : konbit509.app en production ; en développement,
// NEXT_PUBLIC_SITE_URL=http://localhost:3000 dans .env.local.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://konbit509.app"
    : "http://localhost:3000")
).replace(/\/$/, "");
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.cliford.konbit";
export const LEGAL = {
  terms: "https://haitiscope.com/konbit/conditions",
  privacy: "https://haitiscope.com/konbit/confidentialite",
  childSafety: "https://haitiscope.com/konbit/securite-enfants",
};

export const KIND_LABEL = {
  discussion: "Diskisyon",
  idea: "Lide",
  project: "Pwojè",
} as const;

const MONTHS = [
  "janvye",
  "fevriye",
  "mas",
  "avril",
  "me",
  "jen",
  "jiyè",
  "out",
  "septanm",
  "oktòb",
  "novanm",
  "desanm",
];

// Date absolue : les pages sont mises en cache, une date relative serait vite fausse.
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function displayName(
  name: string | null,
  pseudo: string | null,
): string {
  return name?.trim() || pseudo || "Konbit 509";
}

export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
