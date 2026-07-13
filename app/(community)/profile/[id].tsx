import React from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import RemoteImage from "@/components/RemoteImage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BackAppbar from "@/components/AppBar";
import PostsCard from "@/components/PostsCard";
import { useAuth } from "@/app/provider/AuthProvider";
import { CircleUserRound } from "lucide-react-native";
import { isFollowing, followUser, unfollowUser } from "@/lib/socialService";

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userData } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["user-profile", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: posts } = useQuery({
    queryKey: ["user-posts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, profiles(*), post_likes(*), comments(*)")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: following } = useQuery({
    queryKey: ["am-i-following", user?.id, id],
    queryFn: async () => {
      if (!user?.id || !id || user.id === id) return false;
      return await isFollowing(user.id, id);
    },
    enabled: !!user?.id && !!id,
  });

  const followMut = useMutation({
    mutationFn: () => followUser(user!.id, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["am-i-following"] }),
  });
  const unfollowMut = useMutation({
    mutationFn: () => unfollowUser(user!.id, id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["am-i-following"] }),
  });

  const handleMessage = async () => {
    if (!user?.id || !id) return;
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    const myConvs = (existing || []).map((c: any) => c.conversation_id);
    if (myConvs.length > 0) {
      const { data: other } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", id)
        .in("conversation_id", myConvs);
      if (other?.length) {
        // Navigate to existing conversation (simplified: go to messages)
        router.push("/(tabs)/messages");
        return;
      }
    }
    // Create new conversation
    const { data: conv } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();
    if (conv) {
      await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: id },
      ]);
      router.push("/(tabs)/messages");
    }
  };

  const isMyProfile = user?.id === id;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <BackAppbar title={profile?.username || "Profil"} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {profile?.avatar_url ? (
            profile.avatar_url.startsWith("https://") ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <RemoteImage
                path={profile.avatar_url}
                fallback="profile-placeholder"
                style={styles.avatar}
              />
            )
          ) : (
            <View style={styles.avatarPlace}>
              <CircleUserRound color="#9CA3AF" size={40} />
            </View>
          )}
          <Text style={styles.name}>
            {profile?.full_name || profile?.username}
          </Text>
          <Text style={styles.handle}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {!isMyProfile && user?.id && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, following && styles.followingBtn]}
                onPress={() =>
                  following ? unfollowMut.mutate() : followMut.mutate()
                }
              >
                <Text
                  style={[styles.actionText, following && { color: "#1A1A2E" }]}
                >
                  {following ? "Abonné" : "Suivre"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.msgBtn]}
                onPress={handleMessage}
              >
                <MaterialCommunityIcons
                  name="message-outline"
                  size={18}
                  color="#0D9488"
                />
                <Text style={[styles.actionText, { color: "#0D9488" }]}>
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Publications</Text>
          {posts?.map((post: any) => (
            <PostsCard
              key={post.id}
              item={post}
              currentUser={userData || user}
              router={router}
              showMoreIcons
            />
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#0D9488",
  },
  avatarPlace: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#0D9488",
  },
  name: { fontSize: 20, fontWeight: "800", color: "#1A1A2E", marginTop: 12 },
  handle: { fontSize: 14, color: "#9CA3AF", marginTop: 2 },
  bio: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#0D9488",
    borderRadius: 20,
  },
  followingBtn: { backgroundColor: "#F0F0EB" },
  msgBtn: { backgroundColor: "#F0FDFA" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  postsSection: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 12,
  },
});
