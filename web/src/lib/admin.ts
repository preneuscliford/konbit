import type { KonbitImage } from "./data";
import type { AbuseReason } from "./konbit-actions";
import { getSupabase } from "./supabase/client";

// Administration (rôles moderator / admin), mêmes fonctions SQL que l'app :
// chacune revérifie le rôle côté base. L'interface ne fait que les appeler.

export type UserRole = "user" | "tester" | "moderator" | "admin";
export type ModerationAction =
  | "warn"
  | "restrict"
  | "suspend"
  | "lift"
  | "remove_content"
  | "restore_content";
export type ContentType = "konbit" | "reply" | "business" | "business_item";

export interface AdminStats {
  accounts: number;
  accounts_new_7d: number;
  accounts_new_30d: number;
  accounts_active_24h: number;
  accounts_active_7d: number;
  installs_today: number;
  installs_7d: number;
  installs_30d: number;
  deletions_total: number;
  deletions_30d: number;
  konbits_total: number;
  konbits_7d: number;
  replies_7d: number;
  reports_open: number;
  restricted: number;
  suspended: number;
  daily: { day: string; active: number; signups: number }[];
}

export interface QueueItem {
  target_type: ContentType;
  target_id: number;
  report_count: number;
  reasons: AbuseReason[];
  last_reported_at: string;
  body: string | null;
  status: "visible" | "hidden" | "removed" | null;
  media: KonbitImage[];
  konbit_id: number | null;
  author_id: string | null;
  author_pseudo: string | null;
  author_name: string | null;
  author_avatar: string | null;
}

export interface AdminUserAction {
  id: number;
  action: ModerationAction;
  reason: AbuseReason | null;
  note: string | null;
  until: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  avatar_path: string | null;
  role: UserRole;
  created_at: string;
  last_seen_at: string | null;
  restricted_until: string | null;
  suspended_at: string | null;
  // Seulement pour l'admin.
  email: string | null;
  konbits: number;
  replies: number;
  reports_received: number;
  actions: AdminUserAction[];
}

export interface AdminUserRow {
  id: string;
  pseudo: string | null;
  display_name: string | null;
  avatar_path: string | null;
  role: UserRole;
  restricted_until: string | null;
  suspended_at: string | null;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: "Itilizatè",
  tester: "Testè",
  moderator: "Moderatè",
  admin: "Admin",
};

export const ACTION_LABELS: Record<ModerationAction, string> = {
  warn: "Avètisman",
  restrict: "Limite",
  suspend: "Sispann",
  lift: "Sanksyon leve",
  remove_content: "Kontni retire",
  restore_content: "Kontni retabli",
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  konbit: "Piblikasyon",
  reply: "Repons",
  business: "Fich biznis",
  business_item: "Atik katalòg",
};

export class AdminError extends Error {
  constructor(
    readonly code: "not_allowed" | "not_found" | "offline" | "failed",
  ) {
    super(code);
  }
}

export function adminErrorMessage(e: unknown): string {
  const code = e instanceof AdminError ? e.code : "failed";
  return {
    not_allowed: "Ou pa gen dwa fè sa.",
    not_found: "Nou pa jwenn sa ou chèche a.",
    offline: "Pa gen entènèt. Eseye ankò pita.",
    failed: "Gen yon erè. Eseye ankò.",
  }[code];
}

async function rpc<T>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    const message = error.message ?? "";
    if (message.includes("Failed to fetch")) throw new AdminError("offline");
    if (message.includes("not_allowed") || error.code === "42501")
      throw new AdminError("not_allowed");
    if (message.includes("not_found")) throw new AdminError("not_found");
    throw new AdminError("failed");
  }
  return data as T;
}

export const fetchAdminStats = () => rpc<AdminStats>("admin_stats");
export const fetchModerationQueue = () => rpc<QueueItem[]>("moderation_queue");
export const fetchPendingCount = () => rpc<number>("moderation_pending_count");
export const fetchAdminUser = (id: string) =>
  rpc<AdminUser>("admin_user", { target: id });
export const searchUsers = (search: string) =>
  rpc<AdminUserRow[]>("admin_search_users", { search });

export const moderateContent = (
  type: ContentType,
  id: number,
  decision: "remove" | "restore",
  reason?: AbuseReason,
) =>
  rpc<void>("moderate_content", {
    content_type: type,
    content_id: id,
    decision,
    decision_reason: reason ?? null,
  });

export interface UserSanction {
  userId: string;
  action: "warn" | "restrict" | "suspend" | "lift";
  reason?: AbuseReason;
  note?: string;
  days?: number;
  content?: { type: ContentType; id: number };
}

export const moderateUser = (s: UserSanction) =>
  rpc<void>("moderate_user", {
    target: s.userId,
    user_action: s.action,
    action_reason: s.reason ?? null,
    action_note: s.note ?? null,
    days: s.days ?? null,
    content_type: s.content?.type ?? null,
    content_id: s.content?.id ?? null,
  });

export const setUserRole = (userId: string, role: Exclude<UserRole, "admin">) =>
  rpc<void>("set_user_role", { target: userId, new_role: role });

export const sendAnnouncement = (title: string, body: string) =>
  rpc<number>("send_announcement", {
    announcement_title: title.trim(),
    announcement_body: body.trim(),
  });

export const deleteAnnouncement = (id: number) =>
  rpc<void>("delete_announcement", { target: id });

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await getSupabase()
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new AdminError("failed");
  return (data ?? []) as Announcement[];
}
