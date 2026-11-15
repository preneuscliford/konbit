import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, ChevronRight, Store } from "lucide-react-native";
import Colors from "@/constants/Colors";
import ItemLike from "@/components/business/ItemLike";
import PhotoPager from "@/components/business/PhotoPager";
import ImageViewer from "@/components/ui/ImageViewer";
import ShareIcon from "@/components/ui/ShareIcon";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { fetchItem, formatPrice, whatsappUrl } from "@/lib/business";
import { useI18n } from "@/lib/i18n";
import { fetchItemViewStats, fetchMyItemLikes, recordItemView } from "@/lib/itemSocial";
import { mediaUrl } from "@/lib/konbits";
import { shareItem } from "@/lib/share";

// Un produit ou un service en entier : toutes ses photos (glisser, plein
// écran), sa description complète, son prix, J'aime, partage et WhatsApp.
// Ouvrir la page compte comme une vue (jamais pour le propriétaire, qui voit
// ses chiffres à la place).
export default function ItemScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const { userId } = useAuth();
  const { width } = useWindowDimensions();
  const [viewer, setViewer] = useState<number | null>(null);

  const data = useQuery({
    queryKey: ["business", "item", itemId],
    queryFn: () => fetchItem(itemId),
    enabled: itemId > 0,
  });
  const item = data.data?.item;
  const b = data.data?.business;
  const isOwner = !!userId && !!b && b.owner_id === userId;

  const likes = useQuery({
    queryKey: ["business", "itemLikes", itemId, userId],
    queryFn: () => fetchMyItemLikes(userId!, [itemId]),
    enabled: !!userId && itemId > 0,
  });
  const stats = useQuery({
    queryKey: ["business", "itemStats", b?.id],
    queryFn: () => fetchItemViewStats(b!.id),
    enabled: isOwner,
  });

  useEffect(() => {
    if (item && b && !isOwner) recordItemView(item.id);
  }, [item, b, isOwner]);

  const priceLabels = { onRequest: t("App.business.onRequest"), free: t("App.business.free") };
  const photoWidth = Math.min(width, 640);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {item?.name ?? t("App.item.title")}
        </Text>
        {item && b && (
          <Pressable
            onPress={() => shareItem(item.name, formatPrice(item.price, item.currency, priceLabels), b.slug, item.id, t)}
            hitSlop={12}
            accessibilityLabel={t("App.share.action")}
          >
            <ShareIcon size={21} color={Colors.text} />
          </Pressable>
        )}
      </View>

      {data.isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : !item || !b ? (
        <Text style={styles.empty}>{t("App.item.notFound")}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={{ alignItems: "center", backgroundColor: Colors.surfaceMuted }}>
            <PhotoPager
              photos={item.photos}
              width={photoWidth}
              kind={item.kind}
              onOpen={(i) => item.photos.length > 0 && setViewer(i)}
            />
          </View>

          <View style={styles.body}>
            <Text style={styles.kind}>
              {t(item.kind === "service" ? "App.business.service" : "App.business.product")}
              {!item.available ? <Text style={styles.unavailable}>{` · ${t("App.business.unavailable")}`}</Text> : null}
            </Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.price}>{formatPrice(item.price, item.currency, priceLabels)}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

            <View style={styles.actions}>
              <ItemLike itemId={item.id} count={item.like_count ?? 0} liked={!!likes.data?.includes(item.id)} size={26} />
              <Pressable
                onPress={() => shareItem(item.name, formatPrice(item.price, item.currency, priceLabels), b.slug, item.id, t)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("App.share.action")}
              >
                <ShareIcon size={25} color={Colors.textMuted} />
              </Pressable>
            </View>

            {isOwner ? (
              <View style={styles.statsBox}>
                <Text style={styles.statsTitle}>{t("App.item.stats")}</Text>
                <Text style={styles.statsLine}>
                  {t("App.item.views", {
                    total: stats.data?.[item.id]?.total ?? (stats.isLoading ? "…" : 0),
                    week: stats.data?.[item.id]?.week ?? (stats.isLoading ? "…" : 0),
                  })}
                </Text>
                <Text style={styles.statsHint}>{t("App.item.statsHint")}</Text>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/biznis-item", params: { businessId: String(b.id), itemId: String(item.id) } })
                  }
                  hitSlop={6}
                >
                  <Text style={styles.link}>{t("App.item.edit")}</Text>
                </Pressable>
              </View>
            ) : (
              (b.whatsapp || b.phone) && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(whatsappUrl((b.whatsapp || b.phone)!, t("App.business.askItem", { item: item.name })))
                  }
                  style={styles.ask}
                  accessibilityRole="button"
                >
                  <Text style={styles.askText}>{t("App.business.askWhatsapp")}</Text>
                </Pressable>
              )
            )}

            <Pressable
              onPress={() => router.push({ pathname: "/biznis/[slug]", params: { slug: b.slug } })}
              style={styles.business}
              android_ripple={{ color: Colors.ripple }}
            >
              <View style={styles.logo}>
                {b.logo_path ? (
                  <Image source={{ uri: mediaUrl(b.logo_path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Store size={22} color={Colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.businessNameRow}>
                  <Text style={styles.businessName} numberOfLines={1}>
                    {b.name}
                  </Text>
                  {b.verified && <BadgeCheck size={16} color={Colors.textInverse} fill={Colors.primary} />}
                </View>
                <Text style={styles.seeCatalog}>{t("App.item.seeCatalog")}</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          </View>
        </ScrollView>
      )}
      <ImageViewer
        uris={(item?.photos ?? []).map((p) => mediaUrl(p.path))}
        start={viewer}
        onClose={() => setViewer(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
  body: { padding: 16, gap: 6 },
  kind: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
  unavailable: { color: Colors.secondary },
  name: { fontSize: 24, fontWeight: "800", color: Colors.text },
  price: { fontSize: 20, fontWeight: "800", color: Colors.primary },
  description: { fontSize: 15, lineHeight: 22, color: Colors.textLight, marginTop: 6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 28, marginTop: 12, marginBottom: 6 },
  statsBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, gap: 4, marginTop: 6 },
  statsTitle: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
  statsLine: { fontSize: 15, color: Colors.text },
  statsHint: { fontSize: 12, color: Colors.textMuted },
  link: { fontSize: 14, fontWeight: "700", color: Colors.primary, marginTop: 6 },
  ask: { backgroundColor: "#25D366", borderRadius: 24, paddingVertical: 13, alignItems: "center", marginTop: 6 },
  askText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  business: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 18,
    overflow: "hidden",
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  businessNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  businessName: { flexShrink: 1, fontSize: 15, fontWeight: "700", color: Colors.text },
  seeCatalog: { fontSize: 13, color: Colors.textMuted },
});
