import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { ArrowLeft, CalendarDays, MapPin, Share2 } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import FollowButton from "@/components/konbit509/FollowButton";
import KonbitCard from "@/components/konbit509/KonbitCard";
import { Text } from "@/components/ui/Text";
import { useCommuneName } from "@/hooks/useAccountGate";
import { useUserKonbits, useUserProfile } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { coverToneForStatusBar } from "@/lib/imageTone";
import { profileImageUrl } from "@/lib/konbits";

const COVER_HEIGHT = 150;

const MONTHS: Record<string, string[]> = {
  ht: ["janvye", "fevriye", "mas", "avril", "me", "jen", "jiyè", "out", "septanm", "oktòb", "novanm", "desanm"],
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
};

// Page de profil façon X : couverture, photo qui chevauche, nom, @pseudo,
// bio, commune, membre depuis, puis ses konbits. Sur son propre profil :
// « Modifier le profil » et « Partager » ; sur celui des autres : « Partager ».
export default function UserProfileScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const profile = useUserProfile(id);
  const konbits = useUserKonbits(id);
  const communeName = useCommuneName();
  const isMe = userId === id;

  const items = useMemo(() => konbits.data?.pages.flat() ?? [], [konbits.data]);
  const p = profile.data;

  // Barre d'état au-dessus de la couverture : icônes blanches ou noires selon
  // les pixels réellement sous la barre (lib/imageTone.ts). Sans couverture,
  // le dégradé de la marque est sombre : icônes blanches.
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coverUrl = p?.cover_path ? profileImageUrl(p.cover_path) : null;
  const tone = useQuery({
    queryKey: ["cover-tone", coverUrl, width, insets.top],
    queryFn: () =>
      coverToneForStatusBar(coverUrl!, { width, coverHeight: COVER_HEIGHT, statusBarHeight: insets.top }),
    enabled: !!coverUrl && insets.top > 0,
    staleTime: Infinity,
    gcTime: 24 * 3600e3,
    retry: 1,
  });
  const statusStyle = coverUrl ? (tone.data?.style ?? "light") : "light";
  const scrim = !!coverUrl && !!tone.data?.scrim;
  const name = p?.display_name || p?.pseudo || "…";

  async function share() {
    if (!p) return;
    const link = Linking.createURL(`user/${p.id}`);
    await Share.share({
      message: t("App.userProfile.shareMessage", { name, pseudo: p.pseudo ?? "", link }),
    }).catch(() => {});
  }

  const memberSince = p
    ? (() => {
        const d = new Date(p.created_at);
        return t("App.userProfile.memberSince", { date: `${MONTHS[language][d.getMonth()]} ${d.getFullYear()}` });
      })()
    : "";

  const header = (
    <View>
      <View style={styles.cover}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" />
        ) : (
          <LinearGradient colors={["#00209F", "#2541C4", "#D21034"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {/* Couverture très contrastée sous la barre d'état : voile léger pour la lisibilité. */}
        {scrim && (
          <LinearGradient
            colors={statusStyle === "light" ? ["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"] : ["rgba(255,255,255,0.6)", "rgba(255,255,255,0)"]}
            style={[styles.scrim, { height: insets.top + 28 }]}
          />
        )}
      </View>

      <View style={styles.identityBlock}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            <Avatar
              pseudo={p?.pseudo ?? null}
              name={p?.display_name}
              avatarPath={p?.avatar_path}
              seed={id}
              size={86}
              ring
            />
          </View>
        </View>

        <Text style={styles.name}>{name}</Text>
        {p?.pseudo ? <Text style={styles.handle}>@{p.pseudo}</Text> : null}
        {p?.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}

        <View style={styles.metaRow}>
          {p?.commune_slug ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{communeName(p.commune_slug)}</Text>
            </View>
          ) : null}
          {p ? (
            <View style={styles.metaItem}>
              <CalendarDays size={14} color={Colors.textMuted} />
              <Text style={styles.metaText}>{memberSince}</Text>
            </View>
          ) : null}
        </View>

        {/* Abonnements et abonnés : chaque compteur ouvre la liste correspondante. */}
        {p ? (
          <View style={styles.countsRow}>
            <Pressable
              onPress={() => router.push({ pathname: "/user/[id]/follows", params: { id, tab: "following" } })}
              hitSlop={6}
            >
              <Text style={styles.countText}>
                <Text style={styles.countValue}>{p.following_count}</Text> {t("App.follow.followingCount")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push({ pathname: "/user/[id]/follows", params: { id, tab: "followers" } })}
              hitSlop={6}
            >
              <Text style={styles.countText}>
                <Text style={styles.countValue}>{p.followers_count}</Text> {t("App.follow.followersCount")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.actions}>
          {!isMe && <FollowButton userId={id} showBell />}
          {isMe && (
            <Pressable
              onPress={() => router.push("/profile-edit")}
              style={styles.outlineButton}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              accessibilityRole="button"
            >
              <Text style={styles.outlineText}>{t("App.userProfile.edit")}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={share}
            style={styles.outlineButton}
            android_ripple={{ color: "rgba(0,0,0,0.06)" }}
            accessibilityRole="button"
          >
            <Share2 size={16} color={Colors.text} />
            <Text style={styles.outlineText}>{t("App.userProfile.share")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        <View style={styles.tabActive}>
          <Text style={styles.tabText}>Konbit</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar style={statusStyle} />
      {profile.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} />
      ) : !p ? (
        <Text style={styles.empty}>{t("App.userProfile.notFound")}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <KonbitCard konbit={item} />}
          ListHeaderComponent={header}
          onEndReached={() => konbits.hasNextPage && !konbits.isFetchingNextPage && konbits.fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            konbits.isLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : (
              <Text style={styles.empty}>{isMe ? t("App.profile.none") : t("App.userProfile.noKonbits")}</Text>
            )
          }
          ListFooterComponent={konbits.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
        />
      )}

      {/* Retour par-dessus la couverture */}
      <SafeAreaView edges={["top"]} style={styles.backWrap} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  cover: { height: COVER_HEIGHT, backgroundColor: Colors.primary, overflow: "hidden" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0 },
  identityBlock: { paddingHorizontal: 16, gap: 4 },
  avatarRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: -43 },
  avatarWrap: { borderRadius: 50 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 19,
    paddingHorizontal: 16,
    height: 38,
    overflow: "hidden",
  },
  outlineText: { fontSize: 14, fontWeight: "700", color: Colors.text },
  name: { fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 8 },
  handle: { fontSize: 15, color: Colors.textMuted, marginTop: -4 },
  bio: { fontSize: 15, lineHeight: 22, color: Colors.text, marginTop: 6 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: Colors.textMuted },
  countsRow: { flexDirection: "row", gap: 18, marginTop: 8 },
  countText: { fontSize: 14, color: Colors.textMuted },
  countValue: { fontWeight: "800", color: Colors.text },
  tabBar: {
    flexDirection: "row",
    marginTop: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary, paddingVertical: 10 },
  tabText: { fontSize: 15, fontWeight: "800", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 24 },
  backWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  backButton: {
    margin: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
