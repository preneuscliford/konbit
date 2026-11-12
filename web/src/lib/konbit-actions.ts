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
  | "failed";

export const KONBIT_ERRORS: Record<ErrorCode, string> = {
  offline: "Pa gen entènèt. Eseye ankò pita.",
  rate_limited: "Ou fè twòp aksyon nan dènye èdtan an. Eseye pita.",
  not_allowed: "Ou pa gen dwa fè sa.",
  not_found: "Konbit sa a pa egziste ankò.",
  already_done: "Sa deja fèt.",
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
    return { liked: new Set<number>(), joined: new Set<number>() };
  const [likes, joins] = await Promise.all([
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
  ]);
  return {
    liked: new Set<number>(
      (likes.data ?? []).map((r) => r.konbit_id as number),
    ),
    joined: new Set<number>(
      (joins.data ?? []).map((r) => r.konbit_id as number),
    ),
  };
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
