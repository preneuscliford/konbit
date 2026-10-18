import { supabase } from "./supabase";
import { KonbitError } from "./konbits";

// Abonnements (suivre une personne, cloche de notification) et notifications
// dans l'app. Schéma : supabase/migrations/20261017104854_follows_notifications.sql

export interface FollowState {
  following: boolean;
  notify: boolean;
}

export interface FollowListItem {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  avatar_path: string | null;
  bio: string | null;
}

export type FollowListKind = "followers" | "following";

export interface AppNotification {
  id: number;
  type: "new_konbit" | "new_follower";
  konbit_id: number | null;
  read_at: string | null;
  created_at: string;
  actor: FollowListItem | null;
  konbit: { id: number; body: string } | null;
}

const PROFILE_FIELDS = "id, pseudo, display_name, avatar_path, bio";

function fail(error: { message?: string; code?: string }): never {
  if (error.message?.includes("Network request failed")) throw new KonbitError("offline");
  if (error.code === "42501") throw new KonbitError("not_allowed");
  throw new KonbitError("failed");
}

export async function fetchFollowState(meId: string, otherId: string): Promise<FollowState> {
  const { data, error } = await supabase
    .from("follows")
    .select("notify")
    .eq("follower_id", meId)
    .eq("followee_id", otherId)
    .maybeSingle();
  if (error) fail(error);
  return { following: !!data, notify: !!data?.notify };
}

export async function follow(otherId: string) {
  const { error } = await supabase.from("follows").insert({ followee_id: otherId });
  if (error && error.code !== "23505") fail(error);
}

export async function unfollow(meId: string, otherId: string) {
  const { error } = await supabase.from("follows").delete().eq("follower_id", meId).eq("followee_id", otherId);
  if (error) fail(error);
}

export async function setFollowNotify(meId: string, otherId: string, notify: boolean) {
  const { error } = await supabase
    .from("follows")
    .update({ notify })
    .eq("follower_id", meId)
    .eq("followee_id", otherId);
  if (error) fail(error);
}

// Ceux qui suivent `userId` (followers) ou ceux qu'il suit (following).
export async function fetchFollowList(userId: string, kind: FollowListKind): Promise<FollowListItem[]> {
  const query =
    kind === "followers"
      ? supabase
          .from("follows")
          .select(`created_at, person:profiles!follows_follower_id_fkey(${PROFILE_FIELDS})`)
          .eq("followee_id", userId)
      : supabase
          .from("follows")
          .select(`created_at, person:profiles!follows_followee_id_fkey(${PROFILE_FIELDS})`)
          .eq("follower_id", userId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) fail(error);
  return ((data ?? []) as unknown as { person: FollowListItem | null }[])
    .map((row) => row.person)
    .filter((p): p is FollowListItem => !!p);
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `id, type, konbit_id, read_at, created_at,
       actor:profiles!notifications_actor_id_fkey(${PROFILE_FIELDS}),
       konbit:konbits(id, body)`,
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) fail(error);
  return (data ?? []) as unknown as AppNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) fail(error);
  return count ?? 0;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) fail(error);
}
