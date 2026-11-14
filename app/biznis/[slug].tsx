import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { ArrowLeft, BadgeCheck, Phone, Store } from "lucide-react-native";
import Colors from "@/constants/Colors";
import Avatar from "@/components/konbit509/Avatar";
import { BusinessPageSocial } from "@/components/konbit509/BusinessFeedCard";
import ImageViewer from "@/components/ui/ImageViewer";
import ShareIcon from "@/components/ui/ShareIcon";
import { Text } from "@/components/ui/Text";
import { useBusiness, useBusinessItems } from "@/hooks/useBusiness";
import { useCommunes } from "@/hooks/useKonbit";
import { useUserProfile } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import {
  BusinessError,
  deleteItem,
  formatPrice,
  telUrl,
  whatsappUrl,
  type BusinessItem,
} from "@/lib/business";
import { useI18n } from "@/lib/i18n";
import { mediaUrl } from "@/lib/konbits";
import { shareBusiness } from "@/lib/share";


// Fiche d'un business : contact direct (WhatsApp, appel), infos et katalòg.
// Le propriétaire modifie sa fiche et gère son katalòg depuis ici.
export default function BusinessScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { userId } = useAuth();
  const business = useBusiness(slug);
  const b = business.data;
  const items = useBusinessItems(b?.id);
  const owner = useUserProfile(b?.owner_id ?? "");
  const communes = useCommunes();
  const { width } = useWindowDimensions();
  // Photos ouvertes en plein écran (couverture, logo ou photos d'un article).
  const [viewer, setViewer] = useState<{ uris: string[]; start: number } | null>(null);

  if (business.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  if (!b) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="" onBack={() => router.back()} />
        <Text style={styles.empty}>{t("App.business.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const isOwner = !!userId && userId === b.owner_id;
  const where = communes.data?.find((c) => c.slug === b.commune_slug)?.name ?? b.commune_slug;
  const contact = b.whatsapp || b.phone;
  const ownerName = owner.data ? owner.data.display_name || owner.data.pseudo : null;
  const cardWidth = (Math.min(width, 640) - 16 * 2 - 12) / 2;
  const priceLabels = { onRequest: t("App.business.onRequest"), free: t("App.business.free") };

  function removeItem(item: BusinessItem) {
    Alert.alert(t("App.business.deleteItemConfirm", { item: item.name }), undefined, [
      { text: t("App.collectif.no"), style: "cancel" },
      {
        text: t("App.business.deleteItem"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteItem(item);
            await queryClient.invalidateQueries({ queryKey: ["business"] });
          } catch (e) {
            Burnt.toast({
              title: t(`App.business.errors.${e instanceof BusinessError ? e.code : "failed"}`),
              preset: "error",
            });
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopBar
        title={b.name}
        onBack={() => router.back()}
        onShare={() => shareBusiness(b.name, b.slug, t)}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable
          style={styles.cover}
          disabled={!b.cover_path}
          onPress={() => b.cover_path && setViewer({ uris: [mediaUrl(b.cover_path)], start: 0 })}
        >
          {b.cover_path && <Image source={{ uri: mediaUrl(b.cover_path) }} style={StyleSheet.absoluteFill} contentFit="cover" />}
        </Pressable>

        <View style={styles.body}>
          <View style={styles.logoRow}>
            <Pressable
              style={styles.logo}
              disabled={!b.logo_path}
              onPress={() => b.logo_path && setViewer({ uris: [mediaUrl(b.logo_path)], start: 0 })}
            >
              {b.logo_path ? (
                <Image source={{ uri: mediaUrl(b.logo_path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Store size={36} color={Colors.primary} />
              )}
            </Pressable>
            {isOwner && (
              <Pressable onPress={() => router.push("/biznis-edit")} style={styles.outline} accessibilityRole="button">
                <Text style={styles.outlineText}>{t("App.business.edit")}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{b.name}</Text>
            {b.verified && <BadgeCheck size={22} color={Colors.textInverse} fill={Colors.primary} />}
          </View>
          <Text style={styles.meta}>
            {t(`App.business.categories.${b.category}`)} · {where}
          </Text>
          {b.description ? <Text style={styles.description}>{b.description}</Text> : null}

          {/* J'aime, repost / « Site » et partage de la fiche (comme un pòs). */}
          <BusinessPageSocial business={b} />

          {contact && (
            <View style={styles.contactRow}>
              {b.whatsapp && (
                <Pressable
                  onPress={() => Linking.openURL(whatsappUrl(b.whatsapp!, t("App.business.greeting", { name: b.name })))}
                  style={[styles.contact, { backgroundColor: "#25D366" }]}
                  accessibilityRole="button"
                >
                  <Text style={styles.contactText}>{t("App.business.whatsapp")}</Text>
                </Pressable>
              )}
              {b.phone && (
                <Pressable onPress={() => Linking.openURL(telUrl(b.phone!))} style={styles.contact} accessibilityRole="button">
                  <Phone size={16} color={Colors.textInverse} />
                  <Text style={styles.contactText}>{t("App.business.call")}</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.infos}>
            {b.address ? <InfoRow label={t("App.business.address")} value={b.address} /> : null}
            {b.hours ? <InfoRow label={t("App.business.hours")} value={b.hours} /> : null}
            {b.email ? (
              <InfoRow label={t("App.business.email")} value={b.email} onPress={() => Linking.openURL(`mailto:${b.email}`)} />
            ) : null}
            {b.website ? (
              <InfoRow
                label={t("App.business.website")}
                value={b.website.replace(/^https?:\/\//, "")}
                onPress={() => Linking.openURL(b.website!)}
              />
            ) : null}
          </View>

          {owner.data && ownerName && (
            <Pressable
              onPress={() => router.push({ pathname: "/user/[id]", params: { id: b.owner_id } })}
              style={styles.ownerCard}
            >
              <Avatar
                pseudo={owner.data.pseudo}
                name={owner.data.display_name}
                avatarPath={owner.data.avatar_path}
                seed={b.owner_id}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerLabel}>{t("App.business.owner")}</Text>
                <Text style={styles.ownerName} numberOfLines={1}>
                  {ownerName}
                  {owner.data.pseudo ? <Text style={styles.meta}> @{owner.data.pseudo}</Text> : null}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={styles.catalogHeader}>
          <Text style={styles.h2}>
            {t("App.business.catalog")}
            {items.data && items.data.length > 0 ? <Text style={styles.count}> ({items.data.length})</Text> : null}
          </Text>
          {isOwner && (
            <Pressable
              onPress={() => router.push({ pathname: "/biznis-item", params: { businessId: String(b.id) } })}
              style={styles.addItem}
              accessibilityRole="button"
            >
              <Text style={styles.addItemText}>{t("App.business.addItem")}</Text>
            </Pressable>
          )}
        </View>

        {items.isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (items.data ?? []).length === 0 ? (
          <Text style={styles.empty}>{isOwner ? t("App.business.catalogEmptyOwner") : t("App.business.catalogEmpty")}</Text>
        ) : (
          <View style={styles.grid}>
            {(items.data ?? []).map((item) => (
              <View key={item.id} style={[styles.card, { width: cardWidth }, !item.available && { opacity: 0.6 }]}>
                <PhotoPager
                  photos={item.photos}
                  size={cardWidth}
                  kind={item.kind}
                  onOpen={(i) => setViewer({ uris: item.photos.map((p) => mediaUrl(p.path)), start: i })}
                />
                {!item.available && (
                  <View style={styles.unavailable}>
                    <Text style={styles.unavailableText}>{t("App.business.unavailable")}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.kind}>{t(item.kind === "service" ? "App.business.service" : "App.business.product")}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text style={styles.itemDescription} numberOfLines={3}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>{formatPrice(item.price, item.currency, priceLabels)}</Text>
                  {isOwner ? (
                    <View style={styles.ownerActions}>
                      <Pressable
                        onPress={() =>
                          router.push({
                            pathname: "/biznis-item",
                            params: { businessId: String(b.id), itemId: String(item.id) },
                          })
                        }
                        hitSlop={6}
                      >
                        <Text style={styles.link}>{t("App.business.editItem")}</Text>
                      </Pressable>
                      <Pressable onPress={() => removeItem(item)} hitSlop={6}>
                        <Text style={[styles.link, { color: Colors.secondary }]}>{t("App.business.deleteItem")}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    contact && (
                      <Pressable
                        onPress={() => Linking.openURL(whatsappUrl(contact, t("App.business.askItem", { item: item.name })))}
                        style={styles.ask}
                        accessibilityRole="button"
                      >
                        <Text style={styles.askText}>{t("App.business.askWhatsapp")}</Text>
                      </Pressable>
                    )
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <ImageViewer uris={viewer?.uris ?? []} start={viewer?.start ?? null} onClose={() => setViewer(null)} />
    </SafeAreaView>
  );
}

function TopBar({ title, onBack, onShare }: { title: string; onBack: () => void; onShare?: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12}>
        <ArrowLeft size={24} color={Colors.text} />
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {onShare && (
        <Pressable onPress={onShare} hitSlop={12}>
          <ShareIcon size={21} color={Colors.text} />
        </Pressable>
      )}
    </View>
  );
}

function InfoRow({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, onPress && styles.linkValue]} onPress={onPress}>
        {value}
      </Text>
    </View>
  );
}

// Photos d'un article : on les fait défiler du doigt, avec des points.
function PhotoPager({
  photos,
  size,
  kind,
  onOpen,
}: {
  photos: BusinessItem["photos"];
  size: number;
  kind: BusinessItem["kind"];
  onOpen: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]}>
        <Text style={styles.placeholderText}>{kind === "service" ? "✦" : "▢"}</Text>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / size))}
      >
        {photos.map((p, i) => (
          <Pressable key={p.path} onPress={() => onOpen(i)} accessibilityRole="imagebutton">
            <Image source={{ uri: mediaUrl(p.path) }} style={{ width: size, height: size }} contentFit="cover" />
          </Pressable>
        ))}
      </ScrollView>
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((p, i) => (
            <View key={p.path} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
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
  cover: { height: 130, backgroundColor: Colors.primary },
  body: { paddingHorizontal: 16, gap: 6 },
  logoRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: -44 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: Colors.surface,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  outline: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  outlineText: { fontSize: 14, fontWeight: "700", color: Colors.text },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  name: { flexShrink: 1, fontSize: 24, fontWeight: "800", color: Colors.text },
  meta: { fontSize: 14, color: Colors.textMuted },
  description: { fontSize: 15, lineHeight: 22, color: Colors.text, marginTop: 4 },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  contactText: { color: Colors.textInverse, fontWeight: "800", fontSize: 15 },
  infos: { gap: 8, marginTop: 12 },
  infoRow: { flexDirection: "row", gap: 8 },
  infoLabel: { width: 84, fontSize: 14, color: Colors.textMuted },
  infoValue: { flex: 1, fontSize: 14, color: Colors.text },
  linkValue: { color: Colors.primary, fontWeight: "600" },
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  ownerLabel: { fontSize: 12, color: Colors.textMuted },
  ownerName: { fontSize: 15, fontWeight: "800", color: Colors.text },
  catalogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  h2: { fontSize: 18, fontWeight: "800", color: Colors.text },
  count: { fontWeight: "500", color: Colors.textMuted },
  addItem: { backgroundColor: Colors.primary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7 },
  addItemText: { color: Colors.textInverse, fontWeight: "700", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 },
  card: { borderRadius: 16, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  cardBody: { padding: 10, gap: 3 },
  kind: { fontSize: 10, fontWeight: "800", color: Colors.textMuted, textTransform: "uppercase" },
  itemName: { fontSize: 15, fontWeight: "800", color: Colors.text },
  itemDescription: { fontSize: 13, lineHeight: 18, color: Colors.textLight },
  price: { fontSize: 15, fontWeight: "800", color: Colors.primary, marginTop: 4 },
  ownerActions: { flexDirection: "row", gap: 14, marginTop: 6 },
  link: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  ask: { backgroundColor: "#25D366", borderRadius: 16, paddingVertical: 8, alignItems: "center", marginTop: 6 },
  askText: { color: Colors.textInverse, fontWeight: "800", fontSize: 13 },
  unavailable: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unavailableText: { color: Colors.textInverse, fontSize: 11, fontWeight: "800" },
  placeholder: { backgroundColor: Colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 30, color: Colors.textMuted },
  dots: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  dotActive: { width: 14, backgroundColor: "#FFFFFF" },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 24 },
});
