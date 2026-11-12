import {
  BUSINESS_FIELDS,
  ITEM_FIELDS,
  type Business,
  type BusinessItem,
  type ItemPhoto,
} from "./business";
import { getSupabase } from "./supabase/client";

// Écritures du propriétaire d'une fiche, avec sa session (règles RLS de la base).

type Code =
  | "slug_taken"
  | "already_has_business"
  | "catalog_full"
  | "rate_limited"
  | "invalid"
  | "image_too_big"
  | "not_allowed"
  | "offline"
  | "failed";

export const BUSINESS_ERRORS: Record<Code, string> = {
  slug_taken: "Yon lòt fich deja itilize adrès sa a. Chwazi yon lòt.",
  already_has_business: "Ou gen yon fich biznis deja.",
  catalog_full: "Katalòg la plen (100 atik maksimòm).",
  rate_limited: "Ou ajoute twòp atik nan dènye èdtan an. Eseye pita.",
  invalid: "Gen yon enfòmasyon ki pa bon. Tcheke fòm nan.",
  image_too_big: "Foto a twò lou. Chwazi yon lòt.",
  not_allowed: "Ou pa gen dwa fè sa.",
  offline: "Pa gen entènèt. Eseye ankò pita.",
  failed: "Gen yon erè. Eseye ankò.",
};

export class BusinessError extends Error {
  constructor(readonly code: Code) {
    super(code);
  }
}

export const businessErrorMessage = (e: unknown) =>
  BUSINESS_ERRORS[e instanceof BusinessError ? e.code : "failed"];

function toError(
  error: { code?: string; message?: string; details?: string } | null,
): BusinessError {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  if (text.includes("catalog_full")) return new BusinessError("catalog_full");
  if (text.includes("rate_limited")) return new BusinessError("rate_limited");
  if (text.includes("Failed to fetch")) return new BusinessError("offline");
  if (error?.code === "23505") {
    return new BusinessError(
      text.includes("one_per_owner") ? "already_has_business" : "slug_taken",
    );
  }
  if (error?.code === "23514" || text.includes("invalid_media"))
    return new BusinessError("invalid");
  if (error?.code === "42501") return new BusinessError("not_allowed");
  return new BusinessError("failed");
}

export async function fetchMyBusiness(
  userId: string,
): Promise<Business | null> {
  const { data, error } = await getSupabase()
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw toError(error);
  return data as Business | null;
}

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

export async function saveBusiness(
  input: BusinessInput,
  id?: number,
): Promise<Business> {
  const supabase = getSupabase();
  const query = id
    ? supabase.from("businesses").update(input).eq("id", id)
    : supabase.from("businesses").insert(input);
  const { data, error } = await query.select(BUSINESS_FIELDS).single();
  if (error) throw toError(error);
  return data as Business;
}

export async function deleteBusiness(
  business: Business,
  items: BusinessItem[],
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", business.id);
  if (error) throw toError(error);
  const files = [
    business.logo_path,
    business.cover_path,
    ...items.flatMap((i) => i.photos.map((p) => p.path)),
  ].filter((p): p is string => !!p);
  if (files.length) await removeFiles(files);
}

export async function fetchMyItems(
  businessId: number,
): Promise<BusinessItem[]> {
  const { data, error } = await getSupabase()
    .from("business_items")
    .select(ITEM_FIELDS)
    .eq("business_id", businessId)
    .order("position", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw toError(error);
  return (data ?? []) as BusinessItem[];
}

export type ItemInput = Pick<
  BusinessItem,
  | "kind"
  | "name"
  | "description"
  | "price"
  | "currency"
  | "photos"
  | "available"
>;

export async function saveItem(
  businessId: number,
  input: ItemInput,
  id?: number,
): Promise<BusinessItem> {
  const supabase = getSupabase();
  const query = id
    ? supabase.from("business_items").update(input).eq("id", id)
    : supabase
        .from("business_items")
        .insert({
          ...input,
          business_id: businessId,
          position: Date.now() % 1_000_000_000,
        });
  const { data, error } = await query.select(ITEM_FIELDS).single();
  if (error) throw toError(error);
  return data as BusinessItem;
}

export async function deleteItem(item: BusinessItem) {
  const { error } = await getSupabase()
    .from("business_items")
    .delete()
    .eq("id", item.id);
  if (error) throw toError(error);
  if (item.photos.length) await removeFiles(item.photos.map((p) => p.path));
}

// Fichiers devenus inutiles (ancien logo, article supprimé…). Un échec ne
// bloque pas l'utilisateur.
export async function removeFiles(paths: string[]) {
  await getSupabase()
    .storage.from("konbit-media")
    .remove(paths)
    .catch(() => {});
}

// ─── Photos ────────────────────────────────────────────────────────────────

const MAX_SIDE = 1280;
const MAX_BYTES = 1024 * 1024;

// Réduit la photo (1280 px max, JPEG) comme l'app, pour rester sous 1 Mo et
// charger vite sur les petites connexions.
async function compress(
  file: File,
  maxSide: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new BusinessError("failed");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_BYTES) return { blob, width, height };
  }
  throw new BusinessError("image_too_big");
}

export async function uploadPhoto(
  userId: string,
  file: File,
  prefix: "logo" | "cover" | "item",
): Promise<ItemPhoto> {
  const { blob, width, height } = await compress(
    file,
    prefix === "logo" ? 512 : MAX_SIDE,
  );
  const path = `${userId}/biz-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await getSupabase()
    .storage.from("konbit-media")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw toError(error);
  return { type: "image", path, width, height };
}
