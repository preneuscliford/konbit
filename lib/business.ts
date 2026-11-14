import { supabase } from "./supabase";

// Fiches business et katalòg (mêmes tables et règles que le site).
// Schéma : supabase/migrations/20261111120000_business_profiles.sql

export const BUSINESS_CATEGORIES = [
  "food",
  "retail",
  "beauty",
  "health",
  "education",
  "construction",
  "transport",
  "tech",
  "crafts",
  "agriculture",
  "services",
  "other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

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

const BUSINESS_FIELDS =
  "id, owner_id, slug, name, category, commune_slug, address, description, phone, whatsapp, email, website, hours, logo_path, cover_path, status, verified, like_count, repost_count, created_at, updated_at";
const ITEM_FIELDS = "id, business_id, kind, name, description, price, currency, photos, available, position";

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
export const PHONE_PATTERN = /^\+?[0-9 ]{7,20}$/;

export class BusinessError extends Error {
  constructor(
    readonly code:
      | "slug_taken"
      | "already_has_business"
      | "catalog_full"
      | "rate_limited"
      | "invalid"
      | "not_allowed"
      | "offline"
      | "failed",
  ) {
    super(code);
  }
}

function toError(error: { code?: string; message?: string; details?: string } | null): BusinessError {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  if (text.includes("catalog_full")) return new BusinessError("catalog_full");
  if (text.includes("rate_limited")) return new BusinessError("rate_limited");
  if (text.includes("Network request failed")) return new BusinessError("offline");
  if (error?.code === "23505") {
    return new BusinessError(text.includes("one_per_owner") ? "already_has_business" : "slug_taken");
  }
  if (error?.code === "23514" || text.includes("invalid_media")) return new BusinessError("invalid");
  if (error?.code === "42501") return new BusinessError("not_allowed");
  return new BusinessError("failed");
}

// « Kafe Lakay Ò Kap » → « kafe-lakay-o-kap » (adresse de la fiche sur le site).
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

export function formatPrice(price: number | null, currency: "HTG" | "USD", labels: { onRequest: string; free: string }) {
  if (price === null) return labels.onRequest;
  if (price === 0) return labels.free;
  const n = price.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return currency === "USD" ? `${n} $ US` : `${n} goud`;
}

// ─── Lectures ──────────────────────────────────────────────────────────────

export async function fetchBusinesses(filter: { category?: string; commune?: string }): Promise<Business[]> {
  let query = supabase.from("businesses").select(BUSINESS_FIELDS).eq("status", "visible");
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.commune) query = query.eq("commune_slug", filter.commune);
  const { data, error } = await query
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw toError(error);
  return (data ?? []) as Business[];
}

export async function fetchBusiness(slug: string): Promise<Business | null> {
  const { data, error } = await supabase.from("businesses").select(BUSINESS_FIELDS).eq("slug", slug).maybeSingle();
  if (error) throw toError(error);
  return data as Business | null;
}

export async function fetchMyBusiness(userId: string): Promise<Business | null> {
  const { data, error } = await supabase.from("businesses").select(BUSINESS_FIELDS).eq("owner_id", userId).maybeSingle();
  if (error) throw toError(error);
  return data as Business | null;
}

// Le propriétaire voit aussi ses articles masqués (règles de la base).
export async function fetchItems(businessId: number): Promise<BusinessItem[]> {
  const { data, error } = await supabase
    .from("business_items")
    .select(ITEM_FIELDS)
    .eq("business_id", businessId)
    .order("position", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);
  if (error) throw toError(error);
  return (data ?? []) as BusinessItem[];
}

// ─── Écritures du propriétaire ─────────────────────────────────────────────

export type BusinessInput = Pick<
  Business,
  | "slug"
  | "name"
  | "category"
  | "commune_slug"
  | "address"
  | "description"
  | "phone"
  | "whatsapp"
  | "email"
  | "website"
  | "hours"
  | "logo_path"
  | "cover_path"
>;

export async function saveBusiness(input: BusinessInput, id?: number): Promise<Business> {
  const query = id
    ? supabase.from("businesses").update(input).eq("id", id)
    : supabase.from("businesses").insert(input);
  const { data, error } = await query.select(BUSINESS_FIELDS).single();
  if (error) throw toError(error);
  return data as Business;
}

export async function removeFiles(paths: string[]) {
  if (paths.length === 0) return;
  await supabase.storage
    .from("konbit-media")
    .remove(paths)
    .catch(() => {});
}

export async function deleteBusiness(business: Business) {
  const items = await fetchItems(business.id).catch(() => [] as BusinessItem[]);
  const { error } = await supabase.from("businesses").delete().eq("id", business.id);
  if (error) throw toError(error);
  await removeFiles(
    [business.logo_path, business.cover_path, ...items.flatMap((i) => i.photos.map((p) => p.path))].filter(
      (p): p is string => !!p,
    ),
  );
}

export type ItemInput = Pick<BusinessItem, "kind" | "name" | "description" | "price" | "currency" | "photos" | "available">;

export async function saveItem(businessId: number, input: ItemInput, id?: number): Promise<BusinessItem> {
  const query = id
    ? supabase.from("business_items").update(input).eq("id", id)
    : supabase
        .from("business_items")
        .insert({ ...input, business_id: businessId, position: Date.now() % 1_000_000_000 });
  const { data, error } = await query.select(ITEM_FIELDS).single();
  if (error) throw toError(error);
  return data as BusinessItem;
}

export async function deleteItem(item: BusinessItem) {
  const { error } = await supabase.from("business_items").delete().eq("id", item.id);
  if (error) throw toError(error);
  await removeFiles(item.photos.map((p) => p.path));
}
