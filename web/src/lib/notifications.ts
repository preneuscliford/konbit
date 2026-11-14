import { getSupabase } from "./supabase/client";

// Notifications du compte (mêmes données que l'app). Les règles de la base
// ne laissent lire, marquer et effacer que ses propres notifications.

export interface NotificationActor {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  avatar_path: string | null;
}

export interface AppNotification {
  id: number;
  type:
    | "new_konbit"
    | "new_follower"
    | "new_like"
    | "new_reply"
    | "new_participant"
    | "moderation"
    | "announcement";
  konbit_id: number | null;
  announcement_id: number | null;
  read_at: string | null;
  created_at: string;
  actor: NotificationActor | null;
  konbit: { id: number; body: string; title: string | null } | null;
  reply: { body: string } | null;
  moderation: {
    action:
      | "warn"
      | "restrict"
      | "suspend"
      | "lift"
      | "remove_content"
      | "restore_content";
    reason: string | null;
    note: string | null;
    until: string | null;
  } | null;
  announcement: { title: string; body: string } | null;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select(
      `id, type, konbit_id, announcement_id, read_at, created_at,
       actor:profiles!notifications_actor_id_fkey(id, pseudo, display_name, avatar_path),
       konbit:konbits(id, body, title),
       reply:konbit_replies(body),
       moderation:moderation_actions(action, reason, note, until),
       announcement:announcements(title, body)`,
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead() {
  await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}

export async function deleteNotification(id: number) {
  const { error } = await getSupabase()
    .from("notifications")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Textes en kreyòl (mêmes que l'app).
export const NOTIFICATION_TEXT = {
  new_konbit: "lanse yon nouvo konbit",
  new_follower: "kòmanse swiv ou",
  new_like: "renmen konbit ou a",
  new_reply: "reponn konbit ou a",
  new_participant: "di « Mwen ladan » pou konbit ou a",
} as const;

export const ABUSE_LABELS: Record<string, string> = {
  spam: "Spam oswa piblisite",
  harassment: "Arasman",
  hate: "Diskou rayisman",
  violence: "Vyolans oswa menas",
  child_safety: "Danje pou timoun (abi, eksplwatasyon)",
  false_info: "Fo enfòmasyon",
  other: "Lòt rezon",
};

export function moderationText(
  m: NonNullable<AppNotification["moderation"]>,
  untilLabel: string,
): string {
  const reason = m.reason ? (ABUSE_LABELS[m.reason] ?? m.reason) : "";
  switch (m.action) {
    case "warn":
      return `Ou resevwa yon avètisman pou: ${reason}.`;
    case "restrict":
      return `Kont ou limite jiska ${untilLabel} pou: ${reason}. Ou ka li, men ou pa ka pibliye.`;
    case "suspend":
      return `Kont ou sispann pou: ${reason}.`;
    case "lift":
      return "Restriksyon sou kont ou leve. Ou ka pibliye ankò.";
    case "remove_content":
      return `Youn nan piblikasyon ou yo retire pou: ${reason}.`;
    case "restore_content":
      return "Piblikasyon ou an retabli.";
  }
}
