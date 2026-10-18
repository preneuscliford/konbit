import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  deleteAnnouncement,
  fetchAdminStats,
  fetchAdminUser,
  fetchAnnouncements,
  fetchModerationQueue,
  fetchMyModerationStatus,
  fetchPendingCount,
  moderateContent,
  moderateUser,
  searchUsers,
  sendAnnouncement,
  setUserRole,
  type ContentType,
  type UserRole,
  type UserSanction,
} from "@/lib/admin";
import type { AbuseReason } from "@/lib/konbits";

export function useAdminStats() {
  const { isAdmin } = useAuth();
  return useQuery({ queryKey: ["admin", "stats"], queryFn: fetchAdminStats, enabled: isAdmin, staleTime: 60_000 });
}

export function useModerationQueue() {
  const { isModerator } = useAuth();
  return useQuery({ queryKey: ["admin", "queue"], queryFn: fetchModerationQueue, enabled: isModerator });
}

// Badge du menu Administration.
export function usePendingCount() {
  const { isModerator } = useAuth();
  return useQuery({
    queryKey: ["admin", "pending"],
    queryFn: fetchPendingCount,
    enabled: isModerator,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}

export function useAdminUser(id: string) {
  const { isModerator } = useAuth();
  return useQuery({ queryKey: ["admin", "user", id], queryFn: () => fetchAdminUser(id), enabled: isModerator && !!id });
}

export function useUserSearch(search: string) {
  const { isModerator } = useAuth();
  return useQuery({
    queryKey: ["admin", "search", search],
    queryFn: () => searchUsers(search),
    enabled: isModerator,
    staleTime: 30_000,
  });
}

export function useAnnouncements() {
  const { isAdmin } = useAuth();
  return useQuery({ queryKey: ["admin", "announcements"], queryFn: fetchAnnouncements, enabled: isAdmin });
}

// Après toute décision : file, compteurs, fiches et fil sont à rafraîchir.
function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["konbits"] });
  };
}

export function useModerateContent() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (v: { type: ContentType; id: number; decision: "remove" | "restore"; reason?: AbuseReason }) =>
      moderateContent(v.type, v.id, v.decision, v.reason),
    onSuccess: invalidate,
  });
}

export function useModerateUser() {
  const invalidate = useInvalidateAdmin();
  return useMutation({ mutationFn: (s: UserSanction) => moderateUser(s), onSuccess: invalidate });
}

export function useSetUserRole() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (v: { userId: string; role: Exclude<UserRole, "admin"> }) => setUserRole(v.userId, v.role),
    onSuccess: invalidate,
  });
}

export function useSendAnnouncement() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (v: { title: string; body: string }) => sendAnnouncement(v.title, v.body),
    onSuccess: invalidate,
  });
}

// État de son propre compte : bandeau dans l'écran de publication.
export function useMyModerationStatus() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["moderation-status", userId],
    queryFn: fetchMyModerationStatus,
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
}
