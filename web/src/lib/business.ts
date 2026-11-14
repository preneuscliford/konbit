// Fiches business et katalòg : types, catégories et petits outils partagés
// (serveur et navigateur). Schéma : supabase/migrations/20261111120000_business_profiles.sql

export const BUSINESS_CATEGORIES = [
  { value: "food", label: "Manje & bwason" },
  { value: "retail", label: "Komès & boutik" },
  { value: "beauty", label: "Bote & swen" },
  { value: "health", label: "Sante" },
  { value: "education", label: "Edikasyon & fòmasyon" },
  { value: "construction", label: "Konstriksyon & reparasyon" },
  { value: "transport", label: "Transpò" },
  { value: "tech", label: "Teknoloji" },
  { value: "crafts", label: "Atizana & mòd" },
  { value: "agriculture", label: "Agrikilti" },
  { value: "services", label: "Sèvis pwofesyonèl" },
  { value: "other", label: "Lòt" },
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["value"];

export const categoryLabel = (value: string) =>
  BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? "Lòt";

export const isCategory = (value: unknown): value is BusinessCategory =>
  typeof value === "string" &&
  BUSINESS_CATEGORIES.some((c) => c.value === value);

export interface Business {
  id: number;
  owner_id: string;
  slug: string;
  name: string;
  category: BusinessCategory;
  commune_slug: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  logo_path: string | null;
  cover_path: string | null;
  status: "visible" | "hidden" | "removed";
  verified: boolean;
  like_count: number;
  repost_count: number;
  created_at: string;
  updated_at: string;
}

// J'aime / repost / « Site » des fiches : désactivés pour ne pas saturer le
// fil. Prévu plus tard comme option payante, marquée « Sponsorisé ».
export const BUSINESS_SOCIAL_ENABLED = false;

// Fiche reprise dans le fil (repost ou « Site »), avec l'état de l'utilisateur.
export interface FeedBusiness {
  id: number;
  slug: string;
  name: string;
  category: string;
  commune_slug: string;
  description: string | null;
  logo_path: string | null;
  cover_path: string | null;
  verified: boolean;
  owner_id: string;
  like_count: number;
  repost_count: number;
  liked: boolean;
  reposted: boolean;
}

export interface ItemPhoto {
  type: "image";
  path: string;
  width: number;
  height: number;
}

export interface BusinessItem {
  id: number;
  business_id: number;
  kind: "product" | "service";
  name: string;
  description: string | null;
  price: number | null;
  currency: "HTG" | "USD";
  photos: ItemPhoto[];
  available: boolean;
  position: number;
}

export const BUSINESS_FIELDS =
  "id, owner_id, slug, name, category, commune_slug, address, description, phone, whatsapp, email, website, hours, logo_path, cover_path, status, verified, like_count, repost_count, created_at, updated_at";
export const ITEM_FIELDS =
  "id, business_id, kind, name, description, price, currency, photos, available, position";

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const PHONE_PATTERN = /^\+?[0-9 ]{7,20}$/;

// « Kafe Lakay Ò Kap » → « kafe-lakay-o-kap » (adresse de la fiche).
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

// Numéro sans espaces ; un numéro local à 8 chiffres reçoit l'indicatif d'Haïti.
function internationalDigits(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length === 8 ? `509${digits}` : digits;
}

export const whatsappUrl = (phone: string, text?: string) =>
  `https://wa.me/${internationalDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const telUrl = (phone: string) => `tel:+${internationalDigits(phone)}`;

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatPrice(
  price: number | null,
  currency: "HTG" | "USD",
): string {
  if (price === null) return "Pri sou demann";
  if (price === 0) return "Gratis";
  return currency === "USD"
    ? `${NUMBER.format(price)} $ US`
    : `${NUMBER.format(price)} goud`;
}
