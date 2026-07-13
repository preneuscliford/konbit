import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/app/provider/AuthProvider";
import { supabase } from "@/lib/supabase";
import RemoteImage from "@/components/RemoteImage";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CircleUserRound } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import PostsCard from "@/components/PostsCard";
import DeleteAccountButton from "@/components/account/deleteAccount";
import { getFollowersCount, getFollowingCount } from "@/lib/socialService";

const EditProfil = () => {
  const { session, user, userData } = useAuth();
  const router = useRouter();

  const { data: userPosts } = useQuery({
    queryKey: ["user-posts", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, profiles(*), post_likes(*), comments(*)")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!session?.user?.id,
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/(auth)/signIn");
  };

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
          <Text style={styles.displayName}>
            {userData?.full_name || userData?.username}
          </Text>
          <Text style={styles.handle}>
            @{userData?.username || "utilisateur"}
          </Text>
          {userData?.bio ? (
            <Text style={styles.bio}>{userData.bio}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{userPosts?.length || 0}</Text>
              <Text style={styles.statLabel}>Publications</Text>
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

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.settingsGrid}>
            <TouchableOpacity style={styles.settingCard}>
              <Feather name="settings" size={24} color="#0D9488" />
              <Text style={styles.settingLabel}>Paramètres</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingCard}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={24}
                color="#0D9488"
              />
              <Text style={styles.settingLabel}>Favoris</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingCard}>
              <MaterialCommunityIcons
                name="post-outline"
                size={24}
                color="#0D9488"
              />
              <Text style={styles.settingLabel}>Mes Posts</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Publications</Text>
          {userPosts?.map((post: any) => (
            <PostsCard
              key={post.id}
              item={post}
              currentUser={userData || user}
              router={router}
              showMoreIcons
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </TouchableOpacity>
        <DeleteAccountButton />
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
  displayName: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  handle: { fontSize: 14, color: "#9CA3AF", marginTop: 2 },
  bio: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
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
  settingsSection: { paddingHorizontal: 16, marginTop: 12 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 12,
  },
  settingsGrid: { flexDirection: "row", gap: 10 },
  settingCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A2E",
    textAlign: "center",
  },
  postsSection: { paddingHorizontal: 16, marginTop: 24 },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  signOutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});

export default EditProfil;
