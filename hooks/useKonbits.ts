import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  FEED_PAGE_SIZE,
  fetchEnabledFlags,
  fetchFeedPage,
  fetchKonbit,
  fetchPublicProfile,
  fetchReplies,
  setLike,
  setParticipation,
  type Konbit,
} from "@/lib/konbits";

// Le fil dépend de l'utilisateur (champ "joined") : la clé inclut son id.
export const feedKey = (userId: string | null) => ["konbits", "feed", userId] as const;
export const konbitKey = (id: number, userId: string | null) => ["konbits", "one", id, userId] as const;
export const repliesKey = (id: number) => ["konbits", "replies", id] as const;

export const userKonbitsKey = (authorId: string, userId: string | null) =>
  ["konbits", "user", authorId, userId] as const;

const nextCursor = (lastPage: Konbit[]) => {
  if (lastPage.length < FEED_PAGE_SIZE) return undefined;
  const last = lastPage[lastPage.length - 1];
  return { createdAt: last.created_at, id: last.id };
};

// Chargement progressif : 20 konbits par page, la suite au bout du défilement.
export function useFeed() {
  const { userId } = useAuth();
  return useInfiniteQuery({
    queryKey: feedKey(userId),
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as { createdAt: string; id: number } | null,
    getNextPageParam: nextCursor,
    staleTime: 30_000,
  });
}

export function useKonbit(id: number) {
  const { userId } = useAuth();
  return useQuery({ queryKey: konbitKey(id, userId), queryFn: () => fetchKonbit(id) });
}

export function useReplies(id: number) {
  return useQuery({ queryKey: repliesKey(id), queryFn: () => fetchReplies(id), staleTime: 15_000 });
}

// Les konbits d'une personne (page de profil), même pagination que le fil.
export function useUserKonbits(authorId: string) {
  const { userId } = useAuth();
  return useInfiniteQuery({
    queryKey: userKonbitsKey(authorId, userId),
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam, authorId),
    initialPageParam: null as { createdAt: string; id: number } | null,
    getNextPageParam: nextCursor,
    staleTime: 30_000,
  });
}

export function useUserProfile(authorId: string) {
  return useQuery({ queryKey: ["user", authorId], queryFn: () => fetchPublicProfile(authorId), staleTime: 60_000 });
}

// Fonctions cachées derrière des feature flags côté serveur.
export function useFlags() {
  const { userId } = useAuth();
  const query = useQuery({ queryKey: ["flags", userId], queryFn: fetchEnabledFlags, staleTime: 10 * 60_000 });
  const enabled = new Set(query.data ?? []);
  return (key: string) => enabled.has(key);
}

type Toggle = "join" | "like";

function patchKonbit(konbit: Konbit, toggle: Toggle, on: boolean): Konbit {
  const delta = on ? 1 : -1;
  return toggle === "join"
    ? { ...konbit, joined: on, participant_count: Math.max(0, konbit.participant_count + delta) }
    : { ...konbit, liked: on, like_count: Math.max(0, konbit.like_count + delta) };
}

// "Mwen ladan" et J'aime : mise à jour immédiate dans toutes les listes en
// cache (fil, détail, profils), annulée si le serveur refuse.
function useToggle(toggle: Toggle) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const patchAll = (konbitId: number, on: boolean) =>
    queryClient.setQueriesData<InfiniteData<Konbit[]> | Konbit>({ queryKey: ["konbits"] }, (data) => {
      if (!data) return data;
      if ("pages" in data) {
        return {
          ...data,
          pages: data.pages.map((page) =>
            Array.isArray(page) ? page.map((k) => (k.id === konbitId ? patchKonbit(k, toggle, on) : k)) : page,
          ),
        };
      }
      return "id" in data && data.id === konbitId ? patchKonbit(data, toggle, on) : data;
    });

  return useMutation({
    mutationFn: ({ konbit, on }: { konbit: Konbit; on: boolean }) =>
      toggle === "join" ? setParticipation(konbit.id, userId!, on) : setLike(konbit.id, userId!, on),
    onMutate: async ({ konbit, on }) => {
      await queryClient.cancelQueries({ queryKey: ["konbits"] });
      patchAll(konbit.id, on);
    },
    onError: (_error, { konbit, on }) => patchAll(konbit.id, !on),
  });
}

export const useParticipation = () => useToggle("join");
export const useLike = () => useToggle("like");
