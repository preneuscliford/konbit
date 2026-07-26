import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import { useState } from "react";
import { useRouter, Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/app/provider/AuthProvider";
import { supabase } from "@/lib/supabase";
import RemoteImage from "@/components/RemoteImage";
import { Feather, FontAwesome6 } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CircleUserRound } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import KonbitCard from "@/components/KonbitCard";
import { getFollowersCount, getFollowingCount } from "@/lib/socialService";
import {
  getJoinedKonbits,
  getBookmarkedKonbits,
} from "@/lib/konbitServices";
import ProfileTabSelector, {
  ProfileTab,
} from "@/components/ProfileTabSelector";
import Colors from "@/constants/Colors";

const PROFILE_TABS: { key: ProfileTab; label: string }[] = [
  { key: "crees", label: "Créées" },
  { key: "rejointes", label: "Rejointes" },
  { key: "enregistrees", label: "Enregistrées" },
];

const normalizeUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

const stripAt = (handle: string) => handle.replace(/^@/, "");

const EditProfil = () => {
  const { session, user, userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>("crees");

  const { data: userKonbits } = useQuery({
    queryKey: ["user-konbits", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("konbits")
        .select(
          "*, profiles(*), konbit_participants(count), konbit_comments(count)",
        )
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: joinedKonbits } = useQuery({
    queryKey: ["joined-konbits", user?.id],
    queryFn: () => getJoinedKonbits(user!.id),
    enabled: !!user?.id && activeTab === "rejointes",
  });

  const { data: bookmarkedKonbits } = useQuery({
    queryKey: ["bookmarked-konbits", user?.id],
    queryFn: () => getBookmarkedKonbits(user!.id),
    enabled: !!user?.id && activeTab === "enregistrees",
  });

  const { data: followersCount } = useQuery({
    queryKey: ["followers-count", user?.id],
    queryFn: () => getFollowersCount(user!.id),
    enabled: !!user?.id,
  });

  const { data: followingCount } = useQuery({
    queryKey: ["following-count", user?.id],
    queryFn: () => getFollowingCount(user!.id),
    enabled: !!user?.id,
  });

  const activeList =
    activeTab === "crees"
      ? userKonbits
      : activeTab === "rejointes"
        ? joinedKonbits
        : bookmarkedKonbits;

  const emptyLabel =
    activeTab === "crees"
      ? "Aucune Konbit créée pour l'instant"
      : activeTab === "rejointes"
        ? "Aucune Konbit rejointe pour l'instant"
        : "Aucune Konbit enregistrée pour l'instant";

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <CircleUserRound color="#D1D5DB" size={64} />
          <Text style={styles.emptyTitle}>Connectez-vous</Text>
          <Text style={styles.emptySub}>Accédez à votre profil</Text>
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => router.push("/(auth)/signIn")}
          >
            <Text style={styles.loginBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <View style={styles.topBar}>
        <View style={{ width: 36 }} />
        <Text style={styles.topBarTitle}>Profil</Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/(profile)/settings")}
          style={styles.settingsBtn}
          hitSlop={8}
        >
          <Feather name="settings" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {userData?.avatar_url ? (
              userData.avatar_url.startsWith("https://") ? (
                <Image
                  source={{ uri: userData.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <RemoteImage
                  path={userData.avatar_url}
                  fallback="profile-placeholder"
                  style={styles.avatar}
                />
              )
            ) : (
              <CircleUserRound color="#9CA3AF" size={48} />
            )}
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>
              {userData?.full_name || userData?.username}
            </Text>
            {userData?.innovation_badges ? (
              <View style={styles.badge}>
                <Feather name="award" size={12} color={Colors.secondary} />
                <Text style={styles.badgeText}>
                  {userData.innovation_badges}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.handle}>
            @{userData?.username || "utilisateur"}
          </Text>
          {userData?.bio ? (
            <Text style={styles.bio}>{userData.bio}</Text>
          ) : null}

          {userData?.website ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(normalizeUrl(userData.website))}
            >
              <Text style={styles.link}>{userData.website}</Text>
            </TouchableOpacity>
          ) : null}

          {userData?.social_links?.instagram ||
          userData?.social_links?.twitter ? (
            <View style={styles.socialRow}>
              {userData.social_links.instagram ? (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://instagram.com/${stripAt(userData.social_links.instagram)}`,
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
              {userData.social_links.twitter ? (
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(
                      `https://x.com/${stripAt(userData.social_links.twitter)}`,
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

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{userKonbits?.length || 0}</Text>
              <Text style={styles.statLabel}>Konbits créées</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followersCount || 0}</Text>
              <Text style={styles.statLabel}>Abonnés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{followingCount || 0}</Text>
              <Text style={styles.statLabel}>Abonnements</Text>
            </View>
          </View>

          <Link href="/(tabs)/(profile)/editProfile" asChild>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Modifier le profil</Text>
            </TouchableOpacity>
          </Link>
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
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAF5" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A2E",
    marginTop: 8,
  },
  emptySub: { fontSize: 14, color: "#9CA3AF" },
  loginBtn: {
    marginTop: 16,
    backgroundColor: "#0D9488",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topBarTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  settingsBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  avatarWrap: { marginBottom: 12 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#0D9488",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  displayName: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
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
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 24,
  },
  stat: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  statLabel: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: "#E5E7EB" },
  editBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  editBtnText: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  postsSection: { paddingHorizontal: 16, marginTop: 8, minHeight: 60 },
  emptyListText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    paddingVertical: 24,
  },
});

export default EditProfil;
