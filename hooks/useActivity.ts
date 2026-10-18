import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchActivitySummary,
  fetchMyKonbitRefs,
  fetchMyKonbits,
  fetchMyReplies,
  type ActivitySection,
  type KonbitRef,
  type MyKonbit,
  type MyReply,
} from "@/lib/activity";
import { deleteKonbit, deleteReply, setLike, setParticipation } from "@/lib/konbits";

export function useActivitySummary() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["activity", userId, "summary"],
    queryFn: () => fetchActivitySummary(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMyKonbits() {
  const { userId } = useAuth();
  return useQuery<MyKonbit[]>({
    queryKey: ["activity", userId, "konbits"],
    queryFn: () => fetchMyKonbits(userId!),
    enabled: !!userId,
  });
}

export function useMyReplies(enabled: boolean) {
  const { userId } = useAuth();
  return useQuery<MyReply[]>({
    queryKey: ["activity", userId, "replies"],
    queryFn: () => fetchMyReplies(userId!),
    enabled: !!userId && enabled,
  });
}

export function useMyKonbitRefs(kind: "joined" | "liked", enabled: boolean) {
  const { userId } = useAuth();
  return useQuery<KonbitRef[]>({
    queryKey: ["activity", userId, kind],
    queryFn: () => fetchMyKonbitRefs(userId!, kind),
    enabled: !!userId && enabled,
  });
}

type Removal =
  | { section: "konbits"; konbit: MyKonbit }
  | { section: "replies"; id: number }
  | { section: "joined" | "liked"; konbitId: number };

// Retire un élément de l'activité, puis rafraîchit l'activité, le fil et le profil.
export function useRemoveActivity() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: async (item: Removal) => {
      switch (item.section) {
        case "konbits":
          return deleteKonbit(item.konbit.id, item.konbit.media);
        case "replies":
          return deleteReply(item.id);
        case "joined":
          return setParticipation(item.konbitId, userId!, false);
        case "liked":
          return setLike(item.konbitId, userId!, false);
      }
    },
    onSuccess: (_data, item) => {
      // Disparaît tout de suite de la liste affichée.
      const section: ActivitySection = item.section;
      queryClient.setQueryData<{ id?: number; konbit?: { id: number } | null }[]>(
        ["activity", userId, section],
        (rows) =>
          rows?.filter((row) => {
            if (item.section === "konbits") return row.id !== item.konbit.id;
            if (item.section === "replies") return row.id !== item.id;
            return row.konbit?.id !== item.konbitId;
          }),
      );
      queryClient.invalidateQueries({ queryKey: ["activity", userId] });
      // Fil, détail et réponses sont tous sous ["konbits", …].
      queryClient.invalidateQueries({ queryKey: ["konbits"] });
      queryClient.invalidateQueries({ queryKey: ["user", userId] });
    },
  });
}
