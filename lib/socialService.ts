import { supabase } from "./supabase";

// Follow / Unfollow
export const followUser = async (followerId: string, followingId: string) => {
  return supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  return supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
};

export const getFollowersCount = async (userId: string) => {
  const { count } = await supabase.from("follows").select("*", { count: "exact" }).eq("following_id", userId);
  return count || 0;
};

export const getFollowingCount = async (userId: string) => {
  const { count } = await supabase.from("follows").select("*", { count: "exact" }).eq("follower_id", userId);
  return count || 0;
};

export const isFollowing = async (followerId: string, followingId: string) => {
  const { data } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).single();
  return !!data;
};

// Hashtags
export const getTrendingHashtags = async (limit = 6) => {
  const { data } = await supabase.from("hashtags").select("*").order("post_count", { ascending: false }).limit(limit);
  return data || [];
};

// Suggested users (random profiles you're not following)
export const getSuggestedUsers = async (userId: string, limit = 4) => {
  const { data: followed } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  const followedIds = (followed || []).map((f: any) => f.following_id);
  followedIds.push(userId); // exclude self

  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .not("id", "in", `(${followedIds.join(",")})`)
    .limit(limit);

  return data || [];
};