import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import FollowButton from "@/components/konbit509/FollowButton";
import { Text } from "@/components/ui/Text";
import { useUserProfile } from "@/hooks/useKonbits";
import { useFollowList } from "@/hooks/useSocial";
import { useI18n } from "@/lib/i18n";
import type { FollowListItem, FollowListKind } from "@/lib/social";

// Qui suit cette personne, et qui elle suit (deux onglets, comme sur X).
export default function FollowsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: FollowListKind }>();
  const [kind, setKind] = useState<FollowListKind>(tab === "following" ? "following" : "followers");
  const profile = useUserProfile(id);
  const list = useFollowList(id, kind);
  const p = profile.data;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {p?.display_name || p?.pseudo || "…"}
          </Text>
          {p?.pseudo ? <Text style={styles.subtitle}>@{p.pseudo}</Text> : null}
        </View>
      </View>

      <View style={styles.tabs}>
        {(["followers", "following"] as const).map((k) => (
          <Pressable key={k} onPress={() => setKind(k)} style={styles.tab}>
            <Text style={[styles.tabText, kind === k && styles.tabTextActive]}>
              {k === "followers" ? t("App.follow.followersTab") : t("App.follow.followingTab")}
            </Text>
            {kind === k && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={list.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PersonRow person={item} />}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <Text style={styles.empty}>
              {kind === "followers" ? t("App.follow.noFollowers") : t("App.follow.noFollowing")}
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function PersonRow({ person }: { person: FollowListItem }) {
  const router = useRouter();
  const open = () => router.push({ pathname: "/user/[id]", params: { id: person.id } });

  return (
    <Pressable onPress={open} style={styles.row} android_ripple={{ color: "rgba(0,0,0,0.04)" }}>
      <Avatar
        pseudo={person.pseudo}
        name={person.display_name}
        avatarPath={person.avatar_path}
        seed={person.id}
        size={44}
      />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={1}>
          {person.display_name || person.pseudo || "…"}
        </Text>
        {person.pseudo ? <Text style={styles.handle}>@{person.pseudo}</Text> : null}
        {person.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {person.bio}
          </Text>
        ) : null}
      </View>
      <FollowButton userId={person.id} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 10 },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: -2 },
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  tab: { flex: 1, alignItems: "center", paddingTop: 12 },
  tabText: { fontSize: 15, fontWeight: "600", color: Colors.textMuted, paddingBottom: 10 },
  tabTextActive: { color: Colors.text, fontWeight: "800" },
  tabIndicator: { height: 3, width: 56, borderRadius: 2, backgroundColor: Colors.primary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  rowText: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: Colors.text },
  handle: { fontSize: 13, color: Colors.textMuted, marginTop: -2 },
  bio: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
