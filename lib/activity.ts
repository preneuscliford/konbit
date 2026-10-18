import { supabase } from "./supabase";
import { KonbitError, type KonbitImage } from "./konbits";

// « Mon activité » (Paramètres) : ce que l'utilisateur a publié ou fait, avec
// suppression élément par élément. Pas de suppression en bloc : pour tout
// effacer, il y a la suppression du compte.

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
  // Reçu sur mes konbits.
  receivedParticipants: number;
  receivedLikes: number;
  receivedReplies: number;
}

export interface MyKonbit {
  id: number;
  body: string;
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
  konbit: { id: number; body: string } | null;
}

// Un konbit rejoint ("Mwen ladan") ou aimé.
export interface KonbitRef {
  created_at: string;
  konbit: {
    id: number;
    body: string;
    author: { pseudo: string | null; display_name: string | null } | null;
  } | null;
}

function fail(error: { message?: string; code?: string }): never {
  if (error.message?.includes("Network request failed")) throw new KonbitError("offline");
  throw new KonbitError("failed");
}

async function countRows(table: string, column: string, userId: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(column, userId);
  if (error) fail(error);
  return count ?? 0;
}

export async function fetchActivitySummary(userId: string): Promise<ActivitySummary> {
  const [konbits, replies, joined, liked, reportsSent, profile, received] = await Promise.all([
    countRows("konbits", "author_id", userId),
    countRows("konbit_replies", "author_id", userId),
    countRows("konbit_participants", "user_id", userId),
    countRows("konbit_likes", "user_id", userId),
    countRows("abuse_reports", "reporter_id", userId),
    supabase.from("profiles").select("followers_count, following_count").eq("id", userId).single(),
    supabase.from("konbits").select("participant_count, like_count, reply_count").eq("author_id", userId).limit(1000),
  ]);
  if (profile.error) fail(profile.error);
  if (received.error) fail(received.error);
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

// Les konbits masqués par la modération restent visibles pour leur auteur (RLS).
export async function fetchMyKonbits(userId: string): Promise<MyKonbit[]> {
  const { data, error } = await supabase
    .from("konbits")
    .select("id, body, created_at, status, media, participant_count, reply_count, like_count")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) fail(error);
  return (data ?? []) as MyKonbit[];
}

export async function fetchMyReplies(userId: string): Promise<MyReply[]> {
  const { data, error } = await supabase
    .from("konbit_replies")
    .select("id, body, created_at, status, konbit:konbits(id, body)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) fail(error);
  return (data ?? []) as unknown as MyReply[];
}

// konbit est null quand le konbit a été masqué ou supprimé depuis : on l'écarte.
export async function fetchMyKonbitRefs(userId: string, kind: "joined" | "liked"): Promise<KonbitRef[]> {
  const table = kind === "joined" ? "konbit_participants" : "konbit_likes";
  const { data, error } = await supabase
    .from(table)
    .select("created_at, konbit:konbits(id, body, author:profiles!konbits_author_id_fkey(pseudo, display_name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);
  if (error) fail(error);
  return ((data ?? []) as unknown as KonbitRef[]).filter((row) => row.konbit);
}
