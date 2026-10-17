import { Konbit } from "@/types/konbitTypes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL environment variable is missing");
}
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is missing"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const PAGE_SIZE = 10;
const KONBIT_SELECT =
  "*, profiles(*), konbit_participants(count), konbit_comments(count)";

export const getNewKonbits = async (pageParam: number = 1) => {
  const from = (pageParam - 1) * PAGE_SIZE;

  const { data, error, count } = await supabase
    .from("konbits")
    .select(KONBIT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw new Error(error.message);
  return {
    data: (data || []) as Konbit[],
    totalCount: count || 0,
    currentPage: pageParam,
  };
};

const TRENDING_LIMIT = 100;

export const getTrendingKonbits = async () => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("konbits")
    .select(
      "*, profiles(*), konbit_participants(count), konbit_comments(count), konbit_likes(count)",
    )
    .gt("created_at", oneWeekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(TRENDING_LIMIT);

  if (error) throw new Error(error.message);

  const scoredKonbits = (data || []).map((konbit) => ({
    ...konbit,
    score: calculateKonbitScore(konbit),
  }));

  return scoredKonbits.sort(
    (a, b) => (b.score || 0) - (a.score || 0),
  ) as Konbit[];
};

// Fonction dédiée aux Konbits de l'utilisateur
export const getUserKonbits = async (
  pageParam: number = 1,
  userId: string,
) => {
  if (!userId) throw new Error("User ID required");

  const from = (pageParam - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from("konbits")
    .select(KONBIT_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data || []) as Konbit[],
    totalCount: count || 0,
    currentPage: pageParam,
    currentPageSize: (data || []).length,
  };
};

// Helper pour le calcul de score (Tendances) — participants/commentaires/likes
// sont des agrégats `{ count }` renvoyés par PostgREST.
const calculateKonbitScore = (konbit: Konbit) => {
  const timeDiff = Date.now() - new Date(konbit.created_at).getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  const participantCount = konbit.konbit_participants?.[0]?.count ?? 0;
  const commentCount = konbit.konbit_comments?.[0]?.count ?? 0;
  const likeCount = konbit.konbit_likes?.[0]?.count ?? 0;
  return (
    (participantCount * 3 + commentCount * 2 + likeCount) /
    Math.pow(hoursDiff + 1, 1.8)
  );
};
