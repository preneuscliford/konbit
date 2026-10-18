import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { PublicProfile } from "@/lib/konbits";
import {
  fetchFollowList,
  fetchFollowState,
  fetchNotifications,
  fetchUnreadCount,
  follow,
  markAllNotificationsRead,
  setFollowNotify,
  unfollow,
  type FollowListKind,
  type FollowState,
} from "@/lib/social";

const followKey = (me: string | null, other: string) => ["follow", me, other] as const;

// Est-ce que je suis cette personne, et ai-je activé sa cloche ?
export function useFollowState(otherId: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: followKey(userId, otherId),
    queryFn: () => fetchFollowState(userId!, otherId),
    enabled: !!userId && userId !== otherId,
    staleTime: 60_000,
  });
}

// Suivre / ne plus suivre / cloche : immédiat à l'écran (état et compteurs),
// annulé si le serveur refuse.
export function useFollowActions(otherId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const key = followKey(userId, otherId);

  const bumpCounts = (delta: number) => {
    queryClient.setQueryData<PublicProfile>(["user", otherId], (p) =>
      p ? { ...p, followers_count: Math.max(0, p.followers_count + delta) } : p,
    );
    if (userId) {
      queryClient.setQueryData<PublicProfile>(["user", userId], (p) =>
        p ? { ...p, following_count: Math.max(0, p.following_count + delta) } : p,
      );
    }
  };

  const toggleFollow = useMutation({
    mutationFn: (next: boolean) => (next ? follow(otherId) : unfollow(userId!, otherId)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FollowState>(key);
      queryClient.setQueryData<FollowState>(key, { following: next, notify: false });
      bumpCounts(next ? 1 : -1);
      return { previous };
    },
    onError: (_e, next, context) => {
      queryClient.setQueryData(key, context?.previous);
      bumpCounts(next ? -1 : 1);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["follows"] }),
  });

  const toggleNotify = useMutation({
    mutationFn: (next: boolean) => setFollowNotify(userId!, otherId, next),
    onMutate: async (next) => {
      const previous = queryClient.getQueryData<FollowState>(key);
      queryClient.setQueryData<FollowState>(key, (s) => (s ? { ...s, notify: next } : s));
      return { previous };
    },
    onError: (_e, _next, context) => queryClient.setQueryData(key, context?.previous),
  });

  return { toggleFollow, toggleNotify };
}

export function useFollowList(userId: string, kind: FollowListKind) {
  return useQuery({
    queryKey: ["follows", userId, kind],
    queryFn: () => fetchFollowList(userId, kind),
    staleTime: 30_000,
  });
}

export function useNotifications() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: fetchNotifications,
    enabled: !!userId,
    staleTime: 15_000,
  });
}

// Badge de la cloche : rafraîchi chaque minute tant que l'app est ouverte.
export function useUnreadCount() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["notifications-unread", userId],
    queryFn: fetchUnreadCount,
    enabled: !!userId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.setQueryData(["notifications-unread", userId], 0),
  });
}
