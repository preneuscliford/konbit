import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import SearchInput from "@/components/SearchInput";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../provider/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTrendingHashtags,
  getSuggestedUsers,
  followUser,
  unfollowUser,
  isFollowing,
} from "@/lib/socialService";
import RemoteImage from "@/components/RemoteImage";
import { Image } from "expo-image";
import { CircleUserRound } from "lucide-react-native";

const Explore = () => {
  const router = useRouter();
  const { user, userData } = useAuth();
  const queryClient = useQueryClient();

  const { data: hashtags } = useQuery({
    queryKey: ["trending-hashtags"],
    queryFn: () => getTrendingHashtags(6),
  });

  const { data: suggestedUsers } = useQuery({
    queryKey: ["suggested-users", user?.id],
    queryFn: () => getSuggestedUsers(user?.id || "", 4),
    enabled: !!user?.id,
  });

  const followMutation = useMutation({
    mutationFn: (targetId: string) => followUser(user!.id, targetId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["suggested-users"] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: (targetId: string) => unfollowUser(user!.id, targetId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["suggested-users"] }),
  });

  const { data: followingMap } = useQuery({
    queryKey: ["following-map", user?.id, suggestedUsers],
    queryFn: async () => {
      if (!suggestedUsers?.length) return {};
      const map: Record<string, boolean> = {};
      await Promise.all(
        suggestedUsers.map(async (u: any) => {
          const ok = await isFollowing(user!.id, u.id);
          map[u.id] = ok;
        }),
      );
      return map;
    },
    enabled: !!user?.id && !!suggestedUsers?.length,
  });

  const handleFollowToggle = (
    targetId: string,
    currentlyFollowing: boolean,
  ) => {
    if (currentlyFollowing) {
      unfollowMutation.mutate(targetId);
    } else {
      followMutation.mutate(targetId);
    }
  };

  const hashtagsList = hashtags?.length
    ? hashtags.map((h: any) => `#${h.name}`)
    : [
        "#Konbit2026",
        "#HaïtiTech",
        "#Entrepreneuriat",
        "#Diaspora",
        "#Solidarité",
      ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Découvrir</Text>
      </View>
      <View style={styles.searchWrap}>
        <SearchInput />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Trending */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tendances</Text>
          <View style={styles.topicRow}>
            {hashtagsList.map((topic: string) => (
              <TouchableOpacity
                key={topic}
                style={styles.topicChip}
                onPress={() =>
                  router.push({
                    pathname: "/search/[query]",
                    params: { query: topic },
                  })
                }
              >
                <Text style={styles.topicText}>{topic}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Suggested Users */}
        {user?.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personnes à suivre</Text>
            {(suggestedUsers?.length ? suggestedUsers : []).map((u: any) => {
              const isFollowingThis = followingMap?.[u.id] || false;
              return (
                <TouchableOpacity key={u.id} style={styles.userRow}>
                  {u.avatar_url ? (
                    u.avatar_url.startsWith("https://") ? (
                      <Image
                        source={{ uri: u.avatar_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <RemoteImage
                        path={u.avatar_url}
                        fallback="profile-placeholder"
                        style={styles.avatar}
                      />
                    )
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <CircleUserRound color="#9CA3AF" size={22} />
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {u.full_name || u.username}
                    </Text>
                    <Text style={styles.userHandle}>@{u.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.followBtn,
                      isFollowingThis && styles.followingBtn,
                    ]}
                    onPress={() => handleFollowToggle(u.id, isFollowingThis)}
                  >
                    <Text
                      style={[
                        styles.followText,
                        isFollowingThis && styles.followingText,
                      ]}
                    >
                      {isFollowingThis ? "Abonné" : "Suivre"}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Communities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communautés</Text>
          <View style={styles.communityGrid}>
            {["Technologie", "Sport", "Musique", "Cuisine"].map((c) => (
              <TouchableOpacity key={c} style={styles.communityCard}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={28}
                  color="#0D9488"
                />
                <Text style={styles.communityName}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  searchWrap: { paddingHorizontal: 16, marginBottom: 14 },
  scroll: { paddingHorizontal: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 12,
  },
  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicChip: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  topicText: { fontSize: 13, fontWeight: "600", color: "#0D9488" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  userHandle: { fontSize: 12, color: "#9CA3AF" },
  followBtn: {
    backgroundColor: "#0D9488",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  followingBtn: { backgroundColor: "#F0F0EB" },
  followText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  followingText: { color: "#1A1A2E" },
  communityGrid: { flexDirection: "row", gap: 10 },
  communityCard: {
    width: 80,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 6,
  },
  communityName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A1A2E",
    textAlign: "center",
  },
});

export default Explore;
