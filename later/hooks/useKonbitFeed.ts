import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getNewKonbits,
  getTrendingKonbits,
  getUserKonbits,
  PAGE_SIZE,
} from "@/lib/supabase";
import { Konbit } from "@/types/konbitTypes";
import { FeedTab } from "@/components/FeedTabSelector";

interface UnifiedFeed {
  data: Konbit[];
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useKonbitFeed(activeTab: FeedTab, userId?: string): UnifiedFeed {
  const newKonbitsQuery = useInfiniteQuery({
    queryKey: ["konbits", "nouveaux"],
    queryFn: ({ pageParam }) => getNewKonbits(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * PAGE_SIZE < lastPage.totalCount
        ? allPages.length + 1
        : undefined,
    initialPageParam: 1,
    enabled: activeTab === "nouveaux",
  });

  const trendingQuery = useQuery({
    queryKey: ["konbits", "tendances"],
    queryFn: getTrendingKonbits,
    enabled: activeTab === "tendances",
  });

  const userKonbitsQuery = useInfiniteQuery({
    queryKey: ["konbits", "mesKonbits", userId],
    queryFn: ({ pageParam }) => getUserKonbits(pageParam, userId || ""),
    getNextPageParam: (lastPage, allPages) =>
      allPages.length * PAGE_SIZE < lastPage.totalCount
        ? allPages.length + 1
        : undefined,
    initialPageParam: 1,
    enabled: activeTab === "mesKonbits" && !!userId,
  });

  if (activeTab === "tendances") {
    return {
      data: trendingQuery.data || [],
      isLoading: trendingQuery.isLoading,
      isError: trendingQuery.isError,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: () => {},
      refetch: () => trendingQuery.refetch(),
    };
  }

  if (activeTab === "mesKonbits") {
    return {
      data: userKonbitsQuery.data?.pages.flatMap((page) => page.data) || [],
      isLoading: userKonbitsQuery.isLoading,
      isError: userKonbitsQuery.isError,
      isFetchingNextPage: userKonbitsQuery.isFetchingNextPage,
      hasNextPage: !!userKonbitsQuery.hasNextPage,
      fetchNextPage: () => userKonbitsQuery.fetchNextPage(),
      refetch: () => userKonbitsQuery.refetch(),
    };
  }

  return {
    data: newKonbitsQuery.data?.pages.flatMap((page) => page.data) || [],
    isLoading: newKonbitsQuery.isLoading,
    isError: newKonbitsQuery.isError,
    isFetchingNextPage: newKonbitsQuery.isFetchingNextPage,
    hasNextPage: !!newKonbitsQuery.hasNextPage,
    fetchNextPage: () => newKonbitsQuery.fetchNextPage(),
    refetch: () => newKonbitsQuery.refetch(),
  };
}
