import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { BadgeCheck, Store } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AppHeader from "@/components/AppHeader";
import CommunePicker from "@/components/konbit/CommunePicker";
import { BusinessRowSocial, useBusinessListState } from "@/components/konbit509/BusinessFeedCard";
import { Text } from "@/components/ui/Text";
import { useAccountGate } from "@/hooks/useAccountGate";
import { useBusinesses, useMyBusiness } from "@/hooks/useBusiness";
import { useCommunes } from "@/hooks/useKonbit";
import { BUSINESS_CATEGORIES, type Business } from "@/lib/business";
import { useI18n } from "@/lib/i18n";
import { mediaUrl } from "@/lib/konbits";

// Onglet Biznis : l'annuaire des fiches (catégorie, commune), comme sur le site.
export default function BusinessesScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const requireAccount = useAccountGate();
  const communes = useCommunes();
  const [category, setCategory] = useState("");
  const [commune, setCommune] = useState("");
  const list = useBusinesses({ category: category || undefined, commune: commune || undefined });
  const mine = useMyBusiness();
  // J'aime et reposts de l'utilisateur pour toute la liste.
  const ids = useMemo(() => (list.data ?? []).map((b) => b.id), [list.data]);
  const social = useBusinessListState(ids);

  const communeName = (slug: string) => communes.data?.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader title={t("App.business.title")} />

      <FlatList
        data={list.data ?? []}
        keyExtractor={(b) => String(b.id)}
        refreshControl={
          <RefreshControl refreshing={list.isRefetching} onRefresh={() => list.refetch()} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <CommunePicker
                  communes={(communes.data ?? []).filter((c) => c.slug !== "national")}
                  value={commune}
                  onChange={(slug) => setCommune(slug === "all" ? "" : slug)}
                  allowAll
                  compact
                  placeholder={t("App.business.allCommunes")}
                />
              </View>
              <Pressable
                onPress={() =>
                  requireAccount(() =>
                    mine.data
                      ? router.push({ pathname: "/biznis/[slug]", params: { slug: mine.data.slug } })
                      : router.push("/biznis-edit"),
                  )
                }
                style={styles.mineButton}
                android_ripple={{ color: "rgba(255,255,255,0.25)" }}
                accessibilityRole="button"
              >
                <Text style={styles.mineText}>{mine.data ? t("App.business.mine") : t("App.business.create")}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {["", ...BUSINESS_CATEGORIES].map((c) => {
                const active = category === c;
                return (
                  <Pressable
                    key={c || "all"}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, active && styles.chipActive]}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {c ? t(`App.business.categories.${c}`) : t("App.business.all")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <BusinessRow
            business={item}
            liked={social.liked.has(item.id)}
            reposted={social.reposted.has(item.id)}
            communeName={communeName(item.commune_slug)}
            onPress={() => router.push({ pathname: "/biznis/[slug]", params: { slug: item.slug } })}
          />
        )}
        ListEmptyComponent={
          list.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {category || commune ? t("App.business.emptyFiltered") : t("App.business.empty")}
              </Text>
              <Text style={styles.emptyText}>{t("App.business.emptyHint")}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function BusinessRow({
  business: b,
  liked,
  reposted,
  communeName,
  onPress,
}: {
  business: Business;
  liked: boolean;
  reposted: boolean;
  communeName: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} style={styles.row} android_ripple={{ color: Colors.ripple }}>
      <View style={styles.logo}>
        {b.logo_path ? (
          <Image source={{ uri: mediaUrl(b.logo_path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Store size={24} color={Colors.primary} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {b.name}
          </Text>
          {b.verified && <BadgeCheck size={17} color={Colors.textInverse} fill={Colors.primary} />}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {t(`App.business.categories.${b.category}`)} · {communeName}
        </Text>
        {b.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {b.description}
          </Text>
        ) : null}
        {/* J'aime, repost / « Site » et partage, comme dans le fil. */}
        <BusinessRowSocial business={b} liked={liked} reposted={reposted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: { gap: 10, paddingTop: 10, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  mineButton: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, overflow: "hidden" },
  mineText: { color: Colors.textInverse, fontWeight: "700", fontSize: 14 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  chip: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 7 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.textLight },
  chipTextActive: { color: Colors.textInverse },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: Colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: "800", color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted },
  description: { fontSize: 14, lineHeight: 20, color: Colors.textLight },
  empty: { padding: 32, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: Colors.text, textAlign: "center" },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
});
