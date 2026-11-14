import type { KonbitImage } from "./data";
import { getSupabase } from "./supabase/client";

// « Aktivite mwen » : ce que le membre a publié ou fait, avec suppression
// élément par élément (mêmes données que l'app). Pour tout effacer : la
// suppression du compte.

export type ActivitySection = "konbits" | "replies" | "joined" | "liked";
export type ModerationStatus = "visible" | "hidden" | "removed";

const LIST_LIMIT = 100;

export interface ActivitySummary {
  konbits: number;
  replies: number;
  joined: number;
  liked: number;
  following: number;
  followers: number;
  reportsSent: number;
  receivedParticipants: number;
  receivedLikes: number;
  receivedReplies: number;
}

export interface MyKonbit {
  id: number;
  body: string;
  title: string | null;
  kind: string;
  created_at: string;
  status: ModerationStatus;
  media: KonbitImage[];
  participant_count: number;
  reply_count: number;
  like_count: number;
}

export interface MyReply {
  id: number;
  body: string;
  created_at: string;
  status: ModerationStatus;
  konbit: { id: number; body: string; title: string | null } | null;
}

export interface KonbitRef {
  created_at: string;
  konbit: {
    id: number;
    body: string;
    title: string | null;
    author: { pseudo: string | null; display_name: string | null } | null;
  } | null;
}

async function countRows(table: string, column: string, userId: string) {
  const { count, error } = await getSupabase()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, userId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchActivitySummary(
  userId: string,
): Promise<ActivitySummary> {
  const supabase = getSupabase();
  const [konbits, replies, joined, liked, reportsSent, profile, received] =
    await Promise.all([
      countRows("konbits", "author_id", userId),
      countRows("konbit_replies", "author_id", userId),
      countRows("konbit_participants", "user_id", userId),
      countRows("konbit_likes", "user_id", userId),
      countRows("abuse_reports", "reporter_id", userId),
      supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("id", userId)
        .single(),
      supabase
        .from("konbits")
        .select("participant_count, like_count, reply_count")
        .eq("author_id", userId)
        .limit(1000),
    ]);
  if (profile.error) throw profile.error;
  if (received.error) throw received.error;
  const sum = (key: "participant_count" | "like_count" | "reply_count") =>
    (received.data ?? []).reduce((total, row) => total + (row[key] ?? 0), 0);
  return {
    konbits,
    replies,
    joined,
    liked,
    reportsSent,
    following: profile.data.following_count ?? 0,
    followers: profile.data.followers_count ?? 0,
    receivedParticipants: sum("participant_count"),
    receivedLikes: sum("like_count"),
    receivedReplies: sum("reply_count"),
  };
}

// Les konbits masqués par la modération restent visibles pour leur auteur.
export async function fetchMyKonbits(userId: string): Promise<MyKonbit[]> {
  const { data, error } = await getSupabase()
    .from("konbits")
    .select(
      "id, body, title, kind, created_at, status, media, participant_count, reply_count, like_count",
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return (data ?? []) as MyKonbit[];
}

export async function fetchMyReplies(userId: string): Promise<MyReply[]> {
  const { data, error } = await getSupabase()
    .from("konbit_replies")
    .select("id, body, created_at, status, konbit:konbits(id, body, title)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return (data ?? []) as unknown as MyReply[];
}

// konbit vide : masqué ou supprimé depuis, on l'écarte.
export async function fetchMyKonbitRefs(
  userId: string,
  kind: "joined" | "liked",
): Promise<KonbitRef[]> {
  const table = kind === "joined" ? "konbit_participants" : "konbit_likes";
  const { data, error } = await getSupabase()
    .from(table)
    .select(
      "created_at, konbit:konbits(id, body, title, author:profiles!konbits_author_id_fkey(pseudo, display_name))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) throw error;
  return ((data ?? []) as unknown as KonbitRef[]).filter((row) => row.konbit);
}
