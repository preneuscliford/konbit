import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { ImagePlus, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import KeyboardScroll from "@/components/ui/KeyboardScroll";
import { Text, TextInput } from "@/components/ui/Text";
import { useBusinessItems } from "@/hooks/useBusiness";
import { useAuth } from "@/lib/auth";
import { BusinessError, removeFiles, saveItem, type BusinessItem, type ItemPhoto } from "@/lib/business";
import { compressImage } from "@/lib/imageCompression";
import { useI18n } from "@/lib/i18n";
import { mediaUrl, uploadKonbitImage } from "@/lib/konbits";

const MAX_PHOTOS = 3;

// Ajouter ou modifier un article du katalòg (produit ou service).
export default function BusinessItemScreen() {
  const params = useLocalSearchParams<{ businessId: string; itemId?: string }>();
  const businessId = Number(params.businessId);
  const items = useBusinessItems(businessId);
  const item = params.itemId ? items.data?.find((i) => i.id === Number(params.itemId)) : null;

  if (params.itemId && items.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  return <ItemForm key={item?.id ?? "new"} businessId={businessId} item={item ?? null} />;
}

function ItemForm({ businessId, item }: { businessId: number; item: BusinessItem | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const [kind, setKind] = useState<BusinessItem["kind"]>(item?.kind ?? "product");
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : "");
  const [currency, setCurrency] = useState<BusinessItem["currency"]>(item?.currency ?? "HTG");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [photos, setPhotos] = useState<ItemPhoto[]>(item?.photos ?? []);
  // Photos envoyées pendant cette édition (supprimées si on abandonne) et retirées.
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = (e: unknown) => t(`App.business.errors.${e instanceof BusinessError ? e.code : "failed"}`);

  function close() {
    void removeFiles(uploaded);
    router.back();
  }

  async function addPhoto() {
    if (!userId || photos.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const photo = await uploadKonbitImage(userId, await compressImage(asset.uri, asset.width, asset.height));
      setPhotos((list) => [...list, photo]);
      setUploaded((list) => [...list, photo.path]);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(path: string) {
    setPhotos((list) => list.filter((p) => p.path !== path));
    if (uploaded.includes(path)) {
      setUploaded((list) => list.filter((p) => p !== path));
      void removeFiles([path]);
    } else {
      setRemoved((list) => [...list, path]);
    }
  }

  async function save() {
    if (name.trim().length < 2) return setError(t("App.business.item.errors.name"));
    const amount = price.trim() === "" ? null : Number(price.replace(",", "."));
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return setError(t("App.business.item.errors.price"));
    setBusy(true);
    setError(null);
    try {
      await saveItem(
        businessId,
        { kind, name: name.trim(), description: description.trim() || null, price: amount, currency, photos, available },
        item?.id,
      );
      await removeFiles(removed);
      await queryClient.invalidateQueries({ queryKey: ["business"] });
      Burnt.toast({ title: t("App.business.item.saved"), preset: "done" });
      router.back();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const segment = (active: boolean) => [styles.segment, active && styles.segmentActive];
  const segmentText = (active: boolean) => [styles.segmentText, active && styles.segmentTextActive];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={close} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>{item ? t("App.business.item.editTitle") : t("App.business.item.newTitle")}</Text>
      </View>

      <KeyboardScroll contentContainerStyle={styles.content}>
        <View style={styles.segments}>
          <Pressable onPress={() => setKind("product")} style={segment(kind === "product")}>
            <Text style={segmentText(kind === "product")}>{t("App.business.product")}</Text>
          </Pressable>
          <Pressable onPress={() => setKind("service")} style={segment(kind === "service")}>
            <Text style={segmentText(kind === "service")}>{t("App.business.service")}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>{t("App.business.item.name")} *</Text>
        <TextInput value={name} onChangeText={setName} maxLength={80} style={styles.input} autoFocus={!item} />

        <Text style={styles.label}>{t("App.business.item.description")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={300}
          multiline
          style={[styles.input, styles.textarea]}
        />

        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t("App.business.item.price")}</Text>
            <TextInput
              value={price}
              onChangeText={(v) => setPrice(v.replace(/[^\d.,]/g, ""))}
              keyboardType="decimal-pad"
              placeholder={t("App.business.item.pricePlaceholder")}
              style={styles.input}
            />
          </View>
          <View>
            <Text style={styles.label}>{t("App.business.item.currency")}</Text>
            <View style={styles.segments}>
              <Pressable onPress={() => setCurrency("HTG")} style={segment(currency === "HTG")}>
                <Text style={segmentText(currency === "HTG")}>{t("App.business.item.htg")}</Text>
              </Pressable>
              <Pressable onPress={() => setCurrency("USD")} style={segment(currency === "USD")}>
                <Text style={segmentText(currency === "USD")}>{t("App.business.item.usd")}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.label}>{t("App.business.item.photos", { count: photos.length, max: MAX_PHOTOS })}</Text>
        <View style={styles.photos}>
          {photos.map((p) => (
            <View key={p.path} style={styles.thumb}>
              <Image source={{ uri: mediaUrl(p.path) }} style={StyleSheet.absoluteFill} contentFit="cover" />
              <Pressable onPress={() => removePhoto(p.path)} style={styles.removePhoto} hitSlop={6}>
                <X size={14} color={Colors.textInverse} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={addPhoto} style={styles.addPhoto} disabled={uploading}>
              {uploading ? <ActivityIndicator color={Colors.primary} /> : <ImagePlus size={22} color={Colors.primary} />}
            </Pressable>
          )}
        </View>

        <View style={styles.availableRow}>
          <Text style={styles.availableText}>{t("App.business.item.available")}</Text>
          <Switch
            value={available}
            onValueChange={setAvailable}
            trackColor={{ true: Colors.primary, false: Colors.borderStrong }}
            thumbColor="#FFFFFF"
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={save}
          disabled={busy || uploading}
          style={[styles.primary, (busy || uploading) && styles.disabled]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          accessibilityRole="button"
        >
          {busy && <ActivityIndicator size="small" color={Colors.textInverse} />}
          <Text style={styles.primaryText}>{t("App.business.item.save")}</Text>
        </Pressable>
      </KeyboardScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  topTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  label: { fontSize: 14, fontWeight: "700", color: Colors.textLight, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  segments: { flexDirection: "row", gap: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 22, padding: 3 },
  segment: { flex: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { fontSize: 14, fontWeight: "700", color: Colors.textLight },
  segmentTextActive: { color: Colors.textInverse },
  priceRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  photos: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  thumb: { width: 92, height: 92, borderRadius: 14, overflow: "hidden" },
  removePhoto: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhoto: {
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  availableRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  availableText: { fontSize: 15, color: Colors.text },
  error: { color: Colors.error, fontSize: 14 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    marginTop: 14,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: Colors.textInverse, fontWeight: "800", fontSize: 16 },
});
