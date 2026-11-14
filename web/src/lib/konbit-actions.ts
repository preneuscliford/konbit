import type { Konbit, KonbitImage } from "./data";
import { getSupabase } from "./supabase/client";

// Lectures et actions du fil côté navigateur, avec la session de l'utilisateur
// (mêmes tables, mêmes règles RLS que l'app).

export const FEED_PAGE_SIZE = 20;

export type AbuseReason =
  | "spam"
  | "harassment"
  | "hate"
  | "violence"
  | "child_safety"
  | "false_info"
  | "other";

export const ABUSE_REASONS: { value: AbuseReason; label: string }[] = [
  { value: "spam", label: "Spam oswa piblisite" },
  { value: "harassment", label: "Arasman" },
  { value: "hate", label: "Diskou rayisman" },
  { value: "violence", label: "Vyolans oswa menas" },
  { value: "child_safety", label: "Danje pou timoun (abi, eksplwatasyon)" },
  { value: "false_info", label: "Fo enfòmasyon" },
  { value: "other", label: "Lòt rezon" },
];

type ErrorCode =
  | "offline"
  | "rate_limited"
  | "not_allowed"
  | "not_found"
  | "already_done"
  | "full"
  | "ended"
  | "members_only"
  | "invalid_dates"
  | "failed";

export const KONBIT_ERRORS: Record<ErrorCode, string> = {
  offline: "Pa gen entènèt. Eseye ankò pita.",
  rate_limited: "Ou fè twòp aksyon nan dènye èdtan an. Eseye pita.",
  not_allowed: "Ou pa gen dwa fè sa.",
  not_found: "Konbit sa a pa egziste ankò.",
  already_done: "Sa deja fèt.",
  full: "Konbit la plen. Pa gen plas ankò.",
  ended: "Konbit sa a fini deja.",
  members_only:
    "Se moun ki nan konbit la sèlman ki ka ekri la a. Rejwenn li anvan.",
  invalid_dates: "Dat yo pa bon. Tcheke dat kòmansman an ak dire a.",
  failed: "Gen yon erè. Eseye ankò.",
};

export class KonbitError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export const konbitErrorMessage = (e: unknown) =>
  KONBIT_ERRORS[e instanceof KonbitError ? e.code : "failed"];

function toKonbitError(
  error: { code?: string; message?: string } | null,
): KonbitError {
  const message = error?.message ?? "";
  if (message.includes("rate_limited")) return new KonbitError("rate_limited");
  if (message.includes("konbit_full")) return new KonbitError("full");
  if (message.includes("konbit_ended")) return new KonbitError("ended");
  if (message.includes("already_member"))
    return new KonbitError("already_done");
  if (message.includes("invalid_dates"))
    return new KonbitError("invalid_dates");
  // Écriture refusée par la règle « Membres du konbit ».
  if (
    message.includes("row-level security") &&
    message.includes("konbit_replies")
  ) {
    return new KonbitError("members_only");
  }
  if (message.includes("Failed to fetch")) return new KonbitError("offline");
  if (error?.code === "23505") return new KonbitError("already_done");
  if (error?.code === "42501") return new KonbitError("not_allowed");
  return new KonbitError("failed");
}

export interface FeedCursor {
  createdAt: string;
  id: number;
}

export async function fetchFeedPage(
  cursor: FeedCursor | null,
  authorId?: string,
): Promise<Konbit[]> {
  const { data, error } = await getSupabase().rpc("konbit_feed", {
    cursor_created_at: cursor?.createdAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: FEED_PAGE_SIZE,
    ...(authorId ? { only_author: authorId } : {}),
  });
  if (error) throw toKonbitError(error);
  return (data ?? []) as Konbit[];
}

// Ce que l'utilisateur a déjà fait sur ces konbits (pages rendues par le
// serveur sans session : J'aime et « Mwen ladan » à compléter).
export async function fetchMyState(userId: string, ids: number[]) {
  const supabase = getSupabase();
  if (ids.length === 0)
    return {
      liked: new Set<number>(),
      joined: new Set<number>(),
      reposted: new Set<number>(),
    };
  const [likes, joins, reposts] = await Promise.all([
    supabase
      .from("konbit_likes")
      .select("konbit_id")
      .eq("user_id", userId)
      .in("konbit_id", ids),
    supabase
      .from("konbit_participants")
      .select("konbit_id")
      .eq("user_id", userId)
      .in("konbit_id", ids),
    // Reposts simples de l'utilisateur sur ces publications.
    supabase
      .from("konbits")
      .select("repost_of")
      .eq("author_id", userId)
      .eq("is_repost", true)
      .eq("body", "")
      .in("repost_of", ids),
  ]);
  return {
    liked: new Set<number>(
      (likes.data ?? []).map((r) => r.konbit_id as number),
    ),
    joined: new Set<number>(
      (joins.data ?? []).map((r) => r.konbit_id as number),
    ),
    reposted: new Set<number>(
      (reposts.data ?? []).map((r) => r.repost_of as number),
    ),
  };
}

// ─── Repost ────────────────────────────────────────────────────────────────

// Repost simple (sans texte), dans la commune de l'original.
export async function repost(konbit: Pick<Konbit, "id" | "commune_slug">) {
  const { error } = await getSupabase().from("konbits").insert({
    body: "",
    commune_slug: konbit.commune_slug,
    kind: "discussion",
    repost_of: konbit.id,
  });
  // Déjà reposté : l'état voulu est atteint.
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function undoRepost(konbitId: number, userId: string) {
  const { error } = await getSupabase()
    .from("konbits")
    .delete()
    .eq("author_id", userId)
    .eq("repost_of", konbitId)
    .eq("is_repost", true)
    .eq("body", "");
  if (error) throw toKonbitError(error);
}

// Citer (« Site ») : repost avec une légende (texte, emoji, photos).
export async function quoteRepost(
  body: string,
  communeSlug: string,
  media: KonbitImage[],
  repostOf: number,
): Promise<number> {
  const { data, error } = await getSupabase()
    .from("konbits")
    .insert({
      body: body.trim(),
      commune_slug: communeSlug,
      kind: "discussion",
      media,
      repost_of: repostOf,
    })
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

export async function fetchKonbitById(id: number): Promise<Konbit | null> {
  const { data, error } = await getSupabase().rpc("konbit_feed", {
    only_id: id,
    page_size: 1,
  });
  if (error) throw toKonbitError(error);
  return ((data ?? []) as Konbit[])[0] ?? null;
}

export async function setLike(konbitId: number, userId: string, like: boolean) {
  const supabase = getSupabase();
  const { error } = like
    ? await supabase.from("konbit_likes").insert({ konbit_id: konbitId })
    : await supabase
        .from("konbit_likes")
        .delete()
        .eq("konbit_id", konbitId)
        .eq("user_id", userId);
  // Déjà fait : l'état voulu est atteint.
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function setParticipation(
  konbitId: number,
  userId: string,
  join: boolean,
) {
  const supabase = getSupabase();
  const { error } = join
    ? await supabase.from("konbit_participants").insert({ konbit_id: konbitId })
    : await supabase
        .from("konbit_participants")
        .delete()
        .eq("konbit_id", konbitId)
        .eq("user_id", userId);
  if (error && error.code !== "23505") throw toKonbitError(error);
}

// Supprime aussi les photos : sinon elles resteraient en ligne.
export async function deleteKonbit(id: number, media: KonbitImage[] = []) {
  const supabase = getSupabase();
  const { error } = await supabase.from("konbits").delete().eq("id", id);
  if (error) throw toKonbitError(error);
  if (media.length > 0) {
    await supabase.storage
      .from("konbit-media")
      .remove(media.map((m) => m.path))
      .catch(() => {});
  }
}

export async function reportAbuse(
  targetType: "konbit" | "reply" | "business" | "business_item",
  targetId: number,
  reason: AbuseReason,
) {
  const { error } = await getSupabase()
    .from("abuse_reports")
    .insert({ target_type: targetType, target_id: targetId, reason });
  // Déjà signalé par ce compte : rien à corriger.
  if (error && error.code !== "23505") throw toKonbitError(error);
}

// ─── Publier ───────────────────────────────────────────────────────────────

export interface NewKonbit {
  kind: "konbit" | "discussion";
  body: string;
  commune_slug: string;
  media: KonbitImage[];
  // Konbit (action collective) seulement.
  title?: string;
  address_detail?: string | null;
  starts_at?: string;
  ends_at?: string;
  max_participants?: number | null;
}

export async function createKonbit(input: NewKonbit): Promise<number> {
  const row =
    input.kind === "konbit"
      ? input
      : {
          kind: input.kind,
          body: input.body,
          commune_slug: input.commune_slug,
          media: input.media,
        };
  const { data, error } = await getSupabase()
    .from("konbits")
    .insert(row)
    .select("id")
    .single();
  if (error) throw toKonbitError(error);
  return data.id as number;
}

// ─── Messages et réponses dans un konbit ───────────────────────────────────

export interface ThreadReply {
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
  liked?: boolean;
}

const REPLY_FIELDS =
  "id, body, created_at, parent_id, like_count, author_id, author:profiles!konbit_replies_author_id_fkey(pseudo, display_name, avatar_path)";

export async function fetchReplies(konbitId: number): Promise<ThreadReply[]> {
  const { data, error } = await getSupabase()
    .from("konbit_replies")
    .select(REPLY_FIELDS)
    .eq("konbit_id", konbitId)
    .eq("status", "visible")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(300);
  if (error) throw toKonbitError(error);
  return (data ?? []) as unknown as ThreadReply[];
}

export async function postReply(
  konbitId: number,
  body: string,
  parentId: number | null,
): Promise<ThreadReply> {
  const { data, error } = await getSupabase()
    .from("konbit_replies")
    .insert({
      konbit_id: konbitId,
      body: body.trim(),
      ...(parentId ? { parent_id: parentId } : {}),
    })
    .select(REPLY_FIELDS)
    .single();
  if (error) throw toKonbitError(error);
  return data as unknown as ThreadReply;
}

export async function deleteReply(id: number) {
  const { error } = await getSupabase()
    .from("konbit_replies")
    .delete()
    .eq("id", id);
  if (error) throw toKonbitError(error);
}

export async function setReplyLike(
  replyId: number,
  userId: string,
  like: boolean,
) {
  const supabase = getSupabase();
  const { error } = like
    ? await supabase.from("konbit_reply_likes").insert({ reply_id: replyId })
    : await supabase
        .from("konbit_reply_likes")
        .delete()
        .eq("reply_id", replyId)
        .eq("user_id", userId);
  if (error && error.code !== "23505") throw toKonbitError(error);
}

export async function fetchMyReplyLikes(
  userId: string,
  ids: number[],
): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { data } = await getSupabase()
    .from("konbit_reply_likes")
    .select("reply_id")
    .eq("user_id", userId)
    .in("reply_id", ids);
  return new Set((data ?? []).map((r) => r.reply_id as number));
}
