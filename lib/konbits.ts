import type { FeedBusiness } from "./business";
import { supabase } from "./supabase";

// Accès aux konbits (Supabase). Schéma : supabase/migrations/20261016150717_konbit509_v1.sql
// et 20261016163039_konbit_kind_media_likes.sql (type, images, J'aime).

export const KONBIT_MAX_LENGTH = 280;
export const FEED_PAGE_SIZE = 20;
export const MAX_IMAGES = 2;
const MEDIA_BUCKET = "konbit-media";

// "discussion" (affiché « Pòs ») est le type par défaut. "konbit" = action
// collective (titre, lieu, dates, participants). idea / project : anciens types.
export type KonbitKind = "discussion" | "idea" | "project" | "konbit";
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
  // Konbit (action collective) seulement ; vides pour un pòs.
  title: string | null;
  address_detail: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_participants: number | null;
  // Repost : publication d'origine (vide si supprimée), repost simple de
  // l'utilisateur sur cette publication, et nombre de reposts.
  repost_of: number | null;
  is_repost: boolean;
  repost_count: number;
  reposted: boolean;
  original: KonbitOriginal | null;
  // Repost ou « Site » d'une fiche business (fiche vide si supprimée ou masquée).
  business_id?: number | null;
  business?: FeedBusiness | null;
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
  | "repost_count"
  | "author_id"
  | "author_pseudo"
  | "author_name"
  | "author_avatar"
>;

// Repost simple : texte vide (le serveur pointe vers l'original si on
// reposte un repost simple).
export const isPlainRepost = (k: Pick<Konbit, "is_repost" | "body">) => k.is_repost && !k.body.trim();

// Original d'un repost affiché comme une publication (actions sur l'original).
export function originalAsKonbit(o: KonbitOriginal, reposted: boolean): Konbit {
  return {
    ...o,
    joined: false,
    liked: false,
    repost_of: null,
    is_repost: false,
    reposted,
    original: null,
  };
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

// Message dans un konbit (parent_id vide) ou réponse à un message.
export interface KonbitReply {
  id: number;
  konbit_id: number;
  body: string;
  created_at: string;
  parent_id: number | null;
  like_count: number;
  liked?: boolean;
  author_id: string;
  author: { pseudo: string | null; display_name: string | null; avatar_path: string | null } | null;
}

// child_safety : mise en danger d'enfants, masqué dès le premier signalement.
export type AbuseReason = "spam" | "harassment" | "hate" | "violence" | "child_safety" | "false_info" | "other";
export const ABUSE_REASONS: AbuseReason[] = ["spam", "harassment", "hate", "violence", "child_safety", "false_info", "other"];

export interface FeedCursor {
  createdAt: string;
  id: number;
}

// Erreurs ramenées à quelques cas que l'interface sait traduire.
export class KonbitError extends Error {
  constructor(
    readonly code:
      | "offline"
      | "rate_limited"
      | "not_allowed"
      | "not_found"
      | "already_done"
      | "full"
      | "ended"
      | "members_only"
      | "invalid_dates"
      | "failed",
  ) {
    super(code);
  }
}

function toKonbitError(error: { code?: string; message?: string } | null): KonbitError {
  const message = error?.message ?? "";
  if (message.includes("rate_limited")) return new KonbitError("rate_limited");
  if (message.includes("konbit_full")) return new KonbitError("full");
  if (message.includes("konbit_ended")) return new KonbitError("ended");
  if (message.includes("already_member")) return new KonbitError("already_done");
  if (message.includes("invalid_dates")) return new KonbitError("invalid_dates");
  // Écriture refusée par la règle « Membres du konbit ».
  if (message.includes("row-level security") && message.includes("konbit_replies")) {
    return new KonbitError("members_only");
  }
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

// Konbit (action collective) : nom, précision d'adresse, dates, maximum.
export interface KonbitDetails {
  title: string;
  address_detail: string | null;
  starts_at: string;
  ends_at: string;
  max_participants: number | null;
}

export async function createKonbit(
  body: string,
  communeSlug: string,
  kind: KonbitKind = "discussion",
  media: KonbitImage[] = [],
  details?: KonbitDetails,
): Promise<number> {
  const { data, error } = await supabase
    .from("konbits")
    .insert({ body: body.trim(), commune_slug: communeSlug, kind, media, ...(kind === "konbit" ? details : {}) })
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

// Supprime aussi les photos du konbit : sans ça, elles resteraient en ligne.
export async function deleteKonbit(id: number, media: KonbitImage[] = []) {
  const { error } = await supabase.from("konbits").delete().eq("id", id);
  if (error) throw toKonbitError(error);
  if (media.length > 0) {
    await supabase.storage
      .from(MEDIA_BUCKET)
      .remove(media.map((m) => m.path))
      .catch(() => {});
  }
}

// Repost simple (sans texte), dans la commune de l'original.
export async function repost(konbit: Pick<Konbit, "id" | "commune_slug">) {
  const { error } = await supabase
    .from("konbits")
    .insert({ body: "", commune_slug: konbit.commune_slug, kind: "discussion", repost_of: konbit.id });
  // Déjà reposté : l'état voulu est atteint.
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function undoRepost(konbitId: number, userId: string) {
  const { error } = await supabase
    .from("konbits")
    .delete()
    .eq("author_id", userId)
    .eq("repost_of", konbitId)
    .eq("is_repost", true)
    .eq("body", "");
  if (error) throw toKonbitError(error);
}

// Repost avec légende (texte, emoji, photos).
export async function quoteRepost(body: string, communeSlug: string, media: KonbitImage[], repostOf: number): Promise<number> {
  const { data, error } = await supabase
    .from("konbits")
    .insert({ body: body.trim(), commune_slug: communeSlug, kind: "discussion", media, repost_of: repostOf })
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

// ─── Fiches business dans le fil : J'aime, repost, « Site » ───────────────

export async function fetchBusinessSocialState(businessId: number, userId: string) {
  const [like, repost] = await Promise.all([
    supabase.from("business_likes").select("business_id").eq("business_id", businessId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("konbits")
      .select("id")
      .eq("author_id", userId)
      .eq("business_id", businessId)
      .eq("is_repost", true)
      .eq("body", "")
      .limit(1),
  ]);
  return { liked: !!like.data, reposted: (repost.data ?? []).length > 0 };
}

export async function setBusinessLike(businessId: number, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from("business_likes").insert({ business_id: businessId })
    : await supabase.from("business_likes").delete().eq("business_id", businessId).eq("user_id", userId);
  if (error && error.code !== "23505") throw toKonbitError(error);
}

// Repost simple d'une fiche (sans texte), dans la commune de la fiche.
export async function repostBusiness(b: { id: number; commune_slug: string }) {
  const { error } = await supabase
    .from("konbits")
    .insert({ body: "", commune_slug: b.commune_slug, kind: "discussion", business_id: b.id });
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function undoBusinessRepost(businessId: number, userId: string) {
  const { error } = await supabase
    .from("konbits")
    .delete()
    .eq("author_id", userId)
    .eq("business_id", businessId)
    .eq("is_repost", true)
    .eq("body", "");
  if (error) throw toKonbitError(error);
}

// « Site » une fiche : publication avec légende qui montre la fiche.
export async function quoteBusiness(body: string, communeSlug: string, media: KonbitImage[], businessId: number): Promise<number> {
  const { data, error } = await supabase
    .from("konbits")
    .insert({ body: body.trim(), commune_slug: communeSlug, kind: "discussion", media, business_id: businessId })
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

// Fiche à citer (écran « Site »).
export async function fetchFeedBusiness(id: number, userId: string | null): Promise<FeedBusiness | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, slug, name, category, commune_slug, description, logo_path, cover_path, verified, owner_id, like_count, repost_count",
    )
    .eq("id", id)
    .eq("status", "visible")
    .maybeSingle();
  if (error) throw toKonbitError(error);
  if (!data) return null;
  const state = userId ? await fetchBusinessSocialState(id, userId) : { liked: false, reposted: false };
  return { ...data, ...state };
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
      "id, konbit_id, body, created_at, parent_id, like_count, author_id, author:profiles!konbit_replies_author_id_fkey(pseudo, display_name, avatar_path)",
    )
    .eq("konbit_id", konbitId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (error) throw toKonbitError(error);
  return (data ?? []) as unknown as KonbitReply[];
}

// parentId : réponse à un message (une réponse à une réponse est rattachée
// au même message par le serveur).
export async function postReply(konbitId: number, body: string, parentId: number | null = null) {
  const { error } = await supabase
    .from("konbit_replies")
    .insert({ konbit_id: konbitId, body: body.trim(), ...(parentId ? { parent_id: parentId } : {}) });
  if (error) throw toKonbitError(error);
}

export async function setReplyLike(replyId: number, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from("konbit_reply_likes").insert({ reply_id: replyId })
    : await supabase.from("konbit_reply_likes").delete().eq("reply_id", replyId).eq("user_id", userId);
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function fetchMyReplyLikes(userId: string, ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase
    .from("konbit_reply_likes")
    .select("reply_id")
    .eq("user_id", userId)
    .in("reply_id", ids);
  return new Set((data ?? []).map((r) => r.reply_id as number));
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
