import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Lecture seule du contenu public de Konbit 509 (même base que l'app mobile).
// Clé publique : les règles RLS ne laissent passer que ce qui est visible
// par tout le monde dans l'app (konbits visibles, profils publics).
import {
  BUSINESS_FIELDS,
  ITEM_FIELDS,
  type Business,
  type BusinessItem,
} from "./business";
import { SUPABASE_URL } from "./storage";

export { mediaUrl, profileImageUrl } from "./storage";
const supabase = createClient(
  SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

// konbit : action collective (titre, lieu, durée, participants) ;
// discussion : simple message ; idea / project : anciens types (app v1).
export type KonbitKind = "konbit" | "discussion" | "idea" | "project";

export interface KonbitImage {
  type: "image";
  path: string;
  width: number;
  height: number;
}

export interface Konbit {
  id: number;
  body: string;
  commune_slug: string;
  created_at: string;
  kind: KonbitKind;
  media: KonbitImage[];
  participant_count: number;
  reply_count: number;
  like_count: number;
  author_id: string;
  author_pseudo: string | null;
  author_name: string | null;
  author_avatar: string | null;
  // Rempli seulement quand la lecture se fait avec la session de l'utilisateur.
  joined?: boolean;
  liked?: boolean;
  // Konbit (action collective) seulement ; vides pour un message.
  title: string | null;
  address_detail: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_participants: number | null;
  // Repost : publication d'origine (vide si supprimée), nombre de reposts et
  // repost simple de l'utilisateur (rempli avec sa session).
  repost_of?: number | null;
  is_repost?: boolean;
  repost_count?: number;
  reposted?: boolean;
  original?: KonbitOriginal | null;
}

// Publication d'origine d'un repost, telle que la renvoie le fil.
export type KonbitOriginal = Pick<
  Konbit,
  | "id"
  | "body"
  | "kind"
  | "title"
  | "commune_slug"
  | "address_detail"
  | "starts_at"
  | "ends_at"
  | "max_participants"
  | "media"
  | "created_at"
  | "participant_count"
  | "reply_count"
  | "like_count"
  | "author_id"
  | "author_pseudo"
  | "author_name"
  | "author_avatar"
> & { repost_count?: number };

export interface Profile {
  id: string;
  pseudo: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  commune_slug: string | null;
  followers_count: number;
  following_count: number;
  created_at: string;
}

// Message à l’intérieur d’un konbit (parent_id vide) ou réponse à un message.
export interface Reply {
  id: number;
  body: string;
  created_at: string;
  parent_id: number | null;
  like_count: number;
  author_id: string;
  author: {
    pseudo: string | null;
    display_name: string | null;
    avatar_path: string | null;
  } | null;
}

const PROFILE_FIELDS =
  "id, pseudo, display_name, bio, avatar_path, cover_path, commune_slug, followers_count, following_count, created_at";

export async function getRecentKonbits(limit = 20): Promise<Konbit[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const { data, error } = await supabase.rpc("konbit_feed", {
    page_size: limit,
  });
  if (error) throw error;
  return (data ?? []) as Konbit[];
}

export const KONBITS_PAGE_SIZE = 20;

// Page « Konbit yo » : du plus récent au plus ancien, page suivante à partir
// du dernier konbit affiché (date + id), comme le fil de l'app.
export async function getKonbitPage(
  cursor: { createdAt: string; id: number } | null,
): Promise<Konbit[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const { data, error } = await supabase.rpc("konbit_feed", {
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: KONBITS_PAGE_SIZE,
  });
  if (error) throw error;
  return (data ?? []) as Konbit[];
}

export async function getKonbit(id: number): Promise<Konbit | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`konbit:${id}`);
  const { data, error } = await supabase.rpc("konbit_feed", {
    only_id: id,
    page_size: 1,
  });
  if (error) throw error;
  return ((data ?? []) as Konbit[])[0] ?? null;
}

export async function getReplies(konbitId: number): Promise<Reply[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`konbit:${konbitId}`);
  const { data, error } = await supabase
    .from("konbit_replies")
    .select(
      "id, body, created_at, parent_id, like_count, author_id, author:profiles!konbit_replies_author_id_fkey(pseudo, display_name, avatar_path)",
    )
    .eq("konbit_id", konbitId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as Reply[];
}

export async function getProfile(pseudo: string): Promise<Profile | null> {
  "use cache";
  cacheLife("minutes");
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .ilike("pseudo", pseudo)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function getKonbitsByAuthor(authorId: string): Promise<Konbit[]> {
  "use cache";
  cacheLife("minutes");
  const { data, error } = await supabase.rpc("konbit_feed", {
    only_author: authorId,
    page_size: KONBITS_PAGE_SIZE,
  });
  if (error) throw error;
  return (data ?? []) as Konbit[];
}

export async function getRecentPseudos(limit = 50): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await supabase
    .from("profiles")
    .select("pseudo")
    .not("pseudo", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((p) => p.pseudo as string);
}

// Communes : même source que l'app (API HaitiScope), changent rarement.
export async function getCommuneNames(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("days");
  const res = await fetch("https://api.haitiscope.com/api/v1/konbit/communes");
  if (!res.ok) return {};
  const list = (await res.json()) as { slug: string; name: string }[];
  return Object.fromEntries(list.map((c) => [c.slug, c.name]));
}

// ─── Fiches business ───────────────────────────────────────────────────────
// Étiquettes de cache : « businesses » (annuaire) et « business:<slug> »
// (une fiche) ; vidées par app/actions/business.ts après une modification.

export async function getBusiness(slug: string): Promise<Business | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("businesses", `business:${slug}`);
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("slug", slug.toLowerCase())
    .eq("status", "visible")
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function getBusinessItems(
  businessId: number,
  slug: string,
): Promise<BusinessItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`business:${slug}`);
  const { data, error } = await supabase
    .from("business_items")
    .select(ITEM_FIELDS)
    .eq("business_id", businessId)
    .eq("status", "visible")
    .order("position", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as BusinessItem[];
}

// Annuaire : les fiches vérifiées puis les plus récentes, filtrées par catégorie et commune.
export async function getBusinesses(
  filter: { category?: string; commune?: string } = {},
): Promise<Business[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("businesses");
  let query = supabase
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("status", "visible");
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.commune) query = query.eq("commune_slug", filter.commune);
  const { data, error } = await query
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as Business[];
}

export async function getBusinessByOwner(
  ownerId: string,
): Promise<Business | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("businesses");
  const { data, error } = await supabase
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("owner_id", ownerId)
    .eq("status", "visible")
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function getBusinessSlugs(
  limit = 500,
): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("businesses");
  const { data, error } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("status", "visible")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getProfileById(
  id: string,
): Promise<Pick<
  Profile,
  "id" | "pseudo" | "display_name" | "avatar_path"
> | null> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, pseudo, display_name, avatar_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
