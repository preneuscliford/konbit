import { supabase } from "./supabase";

// Accès aux konbits (Supabase). Schéma : supabase/migrations/20261016150717_konbit509_v1.sql
// et 20261016163039_konbit_kind_media_likes.sql (type, images, J'aime).

export const KONBIT_MAX_LENGTH = 280;
export const FEED_PAGE_SIZE = 20;
export const MAX_IMAGES = 2;
const MEDIA_BUCKET = "konbit-media";

// "discussion" est le type par défaut quand rien n'est choisi.
export type KonbitKind = "discussion" | "idea" | "project";
export const KONBIT_KINDS: KonbitKind[] = ["discussion", "idea", "project"];

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
  joined: boolean;
  liked: boolean;
}

// Profil public (page de profil d'une personne).
export interface PublicProfile {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  commune_slug: string | null;
  followers_count: number;
  following_count: number;
  created_at: string;
}

export interface KonbitReply {
  id: number;
  konbit_id: number;
  body: string;
  created_at: string;
  author_id: string;
  author: { pseudo: string | null; display_name: string | null; avatar_path: string | null } | null;
}

export type AbuseReason = "spam" | "harassment" | "hate" | "violence" | "false_info" | "other";
export const ABUSE_REASONS: AbuseReason[] = ["spam", "harassment", "hate", "violence", "false_info", "other"];

export interface FeedCursor {
  createdAt: string;
  id: number;
}

// Erreurs ramenées à quelques cas que l'interface sait traduire.
export class KonbitError extends Error {
  constructor(readonly code: "offline" | "rate_limited" | "not_allowed" | "not_found" | "already_done" | "failed") {
    super(code);
  }
}

function toKonbitError(error: { code?: string; message?: string } | null): KonbitError {
  const message = error?.message ?? "";
  if (message.includes("rate_limited")) return new KonbitError("rate_limited");
  if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
    return new KonbitError("offline");
  }
  if (error?.code === "23505") return new KonbitError("already_done");
  if (error?.code === "42501") return new KonbitError("not_allowed");
  return new KonbitError("failed");
}

// authorId : seulement les konbits d'une personne (page de profil).
export async function fetchFeedPage(cursor: FeedCursor | null, authorId?: string): Promise<Konbit[]> {
  const { data, error } = await supabase.rpc("konbit_feed", {
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: FEED_PAGE_SIZE,
    ...(authorId ? { only_author: authorId } : {}),
  });
  if (error) throw toKonbitError(error);
  return (data ?? []) as Konbit[];
}

export async function fetchKonbit(id: number): Promise<Konbit> {
  const { data, error } = await supabase.rpc("konbit_feed", { only_id: id, page_size: 1 });
  if (error) throw toKonbitError(error);
  const konbit = (data as Konbit[] | null)?.[0];
  if (!konbit) throw new KonbitError("not_found");
  return konbit;
}

export function mediaUrl(path: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

// Photos de profil et de couverture : bucket "avatars", dossier de l'utilisateur.
const PROFILE_BUCKET = "avatars";

export function profileImageUrl(path: string): string {
  return supabase.storage.from(PROFILE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadProfileImage(
  userId: string,
  kind: "avatar" | "cover",
  image: { uri: string },
): Promise<string> {
  const bytes = await fetch(image.uri).then((r) => r.arrayBuffer());
  const path = `${userId}/${kind}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw toKonbitError(error);
  return path;
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, pseudo, display_name, bio, avatar_path, cover_path, commune_slug, followers_count, following_count, created_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw toKonbitError(error);
  if (!data) throw new KonbitError("not_found");
  return data as PublicProfile;
}

// Envoie une image déjà compressée (lib/imageCompression.ts) dans le dossier
// de l'utilisateur ; le serveur refuse tout fichier > 1 Mo ou hors de ce dossier.
export async function uploadKonbitImage(
  userId: string,
  image: { uri: string; width: number; height: number },
): Promise<KonbitImage> {
  const bytes = await fetch(image.uri).then((r) => r.arrayBuffer());
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw toKonbitError(error);
  return { type: "image", path, width: image.width, height: image.height };
}

export async function createKonbit(
  body: string,
  communeSlug: string,
  kind: KonbitKind = "discussion",
  media: KonbitImage[] = [],
): Promise<number> {
  const { data, error } = await supabase
    .from("konbits")
    .insert({ body: body.trim(), commune_slug: communeSlug, kind, media })
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

export async function deleteKonbit(id: number) {
  const { error } = await supabase.from("konbits").delete().eq("id", id);
  if (error) throw toKonbitError(error);
}

export async function setParticipation(konbitId: number, userId: string, join: boolean) {
  const { error } = join
    ? await supabase.from("konbit_participants").insert({ konbit_id: konbitId })
    : await supabase.from("konbit_participants").delete().eq("konbit_id", konbitId).eq("user_id", userId);
  // Déjà dedans : l'état voulu est atteint, pas une erreur pour l'utilisateur.
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function setLike(konbitId: number, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from("konbit_likes").insert({ konbit_id: konbitId })
    : await supabase.from("konbit_likes").delete().eq("konbit_id", konbitId).eq("user_id", userId);
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function fetchReplies(konbitId: number): Promise<KonbitReply[]> {
  const { data, error } = await supabase
    .from("konbit_replies")
    .select(
      "id, konbit_id, body, created_at, author_id, author:profiles!konbit_replies_author_id_fkey(pseudo, display_name, avatar_path)",
    )
    .eq("konbit_id", konbitId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (error) throw toKonbitError(error);
  return (data ?? []) as unknown as KonbitReply[];
}

export async function postReply(konbitId: number, body: string) {
  const { error } = await supabase.from("konbit_replies").insert({ konbit_id: konbitId, body: body.trim() });
  if (error) throw toKonbitError(error);
}

export async function deleteReply(id: number) {
  const { error } = await supabase.from("konbit_replies").delete().eq("id", id);
  if (error) throw toKonbitError(error);
}

export async function reportAbuse(targetType: "konbit" | "reply", targetId: number, reason: AbuseReason) {
  const { error } = await supabase
    .from("abuse_reports")
    .insert({ target_type: targetType, target_id: targetId, reason });
  if (error) throw toKonbitError(error);
}

export async function fetchEnabledFlags(): Promise<string[]> {
  const { data, error } = await supabase.rpc("enabled_flags");
  if (error) throw toKonbitError(error);
  return (data ?? []) as string[];
}
