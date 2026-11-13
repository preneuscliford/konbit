import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchBusiness, fetchBusinesses, fetchItems, fetchMyBusiness } from "@/lib/business";

// Clés de cache des fiches business (invalider ["business"] après une modification).
export function useBusinesses(filter: { category?: string; commune?: string }) {
  return useQuery({
    queryKey: ["business", "list", filter.category ?? "", filter.commune ?? ""],
    queryFn: () => fetchBusinesses(filter),
    staleTime: 60_000,
  });
}

export function useBusiness(slug: string) {
  return useQuery({ queryKey: ["business", "one", slug], queryFn: () => fetchBusiness(slug), staleTime: 30_000 });
}

export function useBusinessItems(businessId: number | undefined) {
  return useQuery({
    queryKey: ["business", "items", businessId],
    queryFn: () => fetchItems(businessId!),
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

export function useMyBusiness() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["business", "mine", userId],
    queryFn: () => fetchMyBusiness(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
