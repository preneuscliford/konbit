import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Image } from "expo-image";
import RemoteImage from "@/components/RemoteImage";
import { Feather, MaterialCommunityIcons, FontAwesome6 } from "@expo/vector-icons";
import BackAppbar from "@/components/AppBar";
import KonbitCard from "@/components/KonbitCard";
import { useAuth } from "@/app/provider/AuthProvider";
import { CircleUserRound } from "lucide-react-native";
import { isFollowing, followUser, unfollowUser } from "@/lib/socialService";
import { getJoinedKonbits } from "@/lib/konbitServices";
import ProfileTabSelector, {
  ProfileTab,
} from "@/components/ProfileTabSelector";
import Colors from "@/constants/Colors";

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "crees", label: "Créées" },
  { key: "rejointes", label: "Rejointes" },
];

const normalizeUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const stripAt = (handle: string) => handle.replace(/^@/, "");

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userData } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProfileTab>("crees");

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

  const { data: konbits } = useQuery({
    queryKey: ["user-konbits", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("konbits")
        .select(
          "*, profiles(*), konbit_participants(count), konbit_comments(count)",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: joinedKonbits } = useQuery({
    queryKey: ["joined-konbits", id],
    queryFn: () => getJoinedKonbits(id),
    enabled: !!id && activeTab === "rejointes",
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
  const activeList = activeTab === "crees" ? konbits : joinedKonbits;
  const emptyLabel =
    activeTab === "crees"
      ? "Aucune Konbit créée pour l'instant"
      : "Aucune Konbit rejointe pour l'instant";

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
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile?.full_name || profile?.username}
            </Text>
            {profile?.innovation_badges ? (
              <View style={styles.badge}>
                <Feather name="award" size={12} color={Colors.secondary} />
                <Text style={styles.badgeText}>
                  {profile.innovation_badges}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.handle}>@{profile?.username}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          {profile?.website ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(normalizeUrl(profile.website))}
            >
              <Text style={styles.link}>{profile.website}</Text>
            </TouchableOpacity>
          ) : null}

          {profile?.social_links?.instagram ||
          profile?.social_links?.twitter ? (
            <View style={styles.socialRow}>
              {profile.social_links.instagram ? (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://instagram.com/${stripAt(profile.social_links.instagram)}`,
                    )
                  }
                >
                  <FontAwesome6
                    name="square-instagram"
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              ) : null}
              {profile.social_links.twitter ? (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://x.com/${stripAt(profile.social_links.twitter)}`,
                    )
                  }
                >
                  <FontAwesome6
                    name="square-x-twitter"
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

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
                  color="#00209F"
                />
                <Text style={[styles.actionText, { color: "#00209F" }]}>
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ProfileTabSelector
          tabs={PROFILE_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <View style={styles.postsSection}>
          {activeList?.length ? (
            activeList.map((konbit: any) => (
              <KonbitCard
                key={konbit.id}
                item={konbit}
                currentUser={userData || user}
                router={router}
                showMoreIcons
              />
            ))
          ) : (
            <Text style={styles.emptyListText}>{emptyLabel}</Text>
          )}
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
    borderColor: "#00209F",
  },
  avatarPlace: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0F0EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#00209F",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  name: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: Colors.secondary },
  handle: { fontSize: 14, color: "#9CA3AF", marginTop: 2 },
  bio: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginTop: 8,
  },
  socialRow: { flexDirection: "row", gap: 16, marginTop: 10 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#00209F",
    borderRadius: 20,
  },
  followingBtn: { backgroundColor: "#F0F0EB" },
  msgBtn: { backgroundColor: "#EEF1FB" },
  actionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  postsSection: { paddingHorizontal: 16, marginTop: 8 },
  emptyListText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    paddingVertical: 24,
  },
});
