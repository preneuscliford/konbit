import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { Handshake, ImagePlus, MapPin, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import Avatar from "@/components/konbit509/Avatar";
import QuotedKonbit from "@/components/konbit509/QuotedKonbit";
import RestrictionBanner, { useRestriction } from "@/components/konbit509/RestrictionBanner";
import EmojiButton, { useEmojiInput } from "@/components/ui/EmojiButton";
import KeyboardScroll from "@/components/ui/KeyboardScroll";
import LinkedText from "@/components/ui/LinkedText";
import { Text, TextInput } from "@/components/ui/Text";
import { useCommunes } from "@/hooks/useKonbit";
import { useKonbit } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import { compressImage, type CompressedImage } from "@/lib/imageCompression";
import { useI18n } from "@/lib/i18n";
import {
  createKonbit,
  KONBIT_MAX_LENGTH,
  KonbitError,
  MAX_IMAGES,
  quoteRepost,
  repost,
  uploadKonbitImage,
} from "@/lib/konbits";
import { COMMUNITY_RULES_URL } from "@/lib/legal";

// Commune « tout le pays » : un pòs sans commune choisie.
export const NATIONAL = "national";

// Publier un pòs (comme X) : le texte d'abord, puis trois icônes discrètes :
// photo, commune (facultative) et 🤝 pour en faire un konbit (action
// collective, écran compose-konbit) en gardant ce qui est déjà écrit.
export default function ComposeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPost, profile, userId } = useAuth();
  const communes = useCommunes();
  const restriction = useRestriction();
  // Repost avec message : la publication d'origine s'affiche en dessous.
  const params = useLocalSearchParams<{ repostOf?: string }>();
  const repostOf = params.repostOf ? Number(params.repostOf) : null;
  const original = useKonbit(repostOf ?? 0);
  const quoting = repostOf !== null;

  const [body, setBody] = useState("");
  const [communeSlug, setCommuneSlug] = useState("");
  const [pickCommune, setPickCommune] = useState(false);
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emoji = useEmojiInput(body, setBody, KONBIT_MAX_LENGTH);

  if (!canPost) return <Redirect href="/account" />;

  const remaining = KONBIT_MAX_LENGTH - body.length;
  // Un repost peut partir sans légende ; un pòs a besoin de texte.
  const canSubmit =
    (quoting ? !!original.data : body.trim().length > 0) && !sending && !preparing && !restriction.blocked;

  async function pickImages() {
    const slots = MAX_IMAGES - images.length;
    if (slots <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: slots > 1,
      selectionLimit: slots,
      quality: 1,
    });
    if (result.canceled) return;
    setError(null);
    setPreparing(true);
    try {
      // Compressée tout de suite : l'aperçu montre déjà ce qui sera envoyé.
      const compressed = await Promise.all(
        result.assets.slice(0, slots).map((a) => compressImage(a.uri, a.width, a.height)),
      );
      setImages((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES));
    } catch {
      setError(t("App.compose.imageError"));
    } finally {
      setPreparing(false);
    }
  }

  async function publish() {
    if (!canSubmit || !userId) return;
    setError(null);
    setSending(true);
    try {
      const media = await Promise.all(images.map((image) => uploadKonbitImage(userId, image)));
      if (quoting && original.data) {
        // Sans légende ni photo : repost simple. Sinon : repost avec message.
        if (!body.trim() && media.length === 0) await repost(original.data);
        else await quoteRepost(body, communeSlug || original.data.commune_slug, media, original.data.id);
      } else {
        await createKonbit(body, communeSlug || NATIONAL, "discussion", media);
      }
      await queryClient.invalidateQueries({ queryKey: ["konbits"] });
      Burnt.toast({ title: t(quoting ? "App.repost.published" : "App.compose.published"), preset: "done" });
      router.back();
    } catch (e) {
      setError(t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`));
      setSending(false);
    }
  }

  // Pòs → konbit : le texte devient l'explication ; photos et commune suivent.
  function toKonbit() {
    router.replace({
      pathname: "/compose-konbit",
      params: { body, commune: communeSlug, images: JSON.stringify(images) },
    });
  }

  const communeLabel = communes.data?.find((c) => c.slug === communeSlug)?.name ?? communeSlug;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <Pressable
          onPress={publish}
          disabled={!canSubmit}
          style={[styles.publish, !canSubmit && styles.publishDisabled]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          accessibilityRole="button"
        >
          {sending && <ActivityIndicator size="small" color={Colors.textInverse} />}
          <Text style={styles.publishText}>
            {sending ? t("App.compose.publishing") : t(quoting ? "App.repost.action" : "App.compose.publish")}
          </Text>
        </Pressable>
      </View>

      <KeyboardScroll contentContainerStyle={styles.content}>
        {restriction.blocked && <RestrictionBanner message={restriction.message} />}

        <View style={styles.row}>
          <Avatar
            pseudo={profile?.pseudo ?? null}
            name={profile?.display_name}
            avatarPath={profile?.avatar_path}
            seed={userId ?? ""}
          />
          <TextInput
            value={body}
            onChangeText={(text) => setBody(text.slice(0, KONBIT_MAX_LENGTH))}
            onSelectionChange={emoji.onSelectionChange}
            placeholder={t(quoting ? "App.repost.captionPlaceholder" : "App.compose.placeholder")}
            maxLength={KONBIT_MAX_LENGTH}
            multiline
            autoFocus
            style={styles.input}
          />
        </View>

        {images.length > 0 && (
          <View style={styles.images}>
            {images.map((img) => (
              <View key={img.uri} style={styles.imageWrap}>
                <Image source={{ uri: img.uri }} style={styles.image} contentFit="cover" />
                <Pressable
                  onPress={() => setImages((list) => list.filter((i) => i.uri !== img.uri))}
                  style={styles.removeImage}
                  hitSlop={6}
                  accessibilityLabel={t("App.compose.removeImage")}
                >
                  <X size={16} color={Colors.textInverse} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {quoting && <QuotedKonbit original={original.data ?? null} disabled />}

        {communeSlug ? (
          <View style={styles.communeChip}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.communeChipText}>{communeLabel}</Text>
            <Pressable onPress={() => setCommuneSlug("")} hitSlop={10} accessibilityLabel={t("App.close")}>
              <X size={14} color={Colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {pickCommune && (
          <CommunePicker
            communes={(communes.data ?? []).filter((c) => c.slug !== NATIONAL)}
            value={communeSlug}
            onChange={(slug) => {
              setCommuneSlug(slug);
              setPickCommune(false);
            }}
            placeholder={t("App.compose.addCommune")}
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.toolbar}>
          <Pressable
            onPress={pickImages}
            disabled={images.length >= MAX_IMAGES || preparing}
            style={[styles.tool, (images.length >= MAX_IMAGES || preparing) && styles.toolDisabled]}
            hitSlop={6}
            accessibilityLabel={t("App.compose.addImage")}
          >
            {preparing ? <ActivityIndicator size="small" color={Colors.primary} /> : <ImagePlus size={22} color={Colors.primary} />}
          </Pressable>
          <Pressable
            onPress={() => setPickCommune((v) => !v)}
            style={styles.tool}
            hitSlop={6}
            accessibilityLabel={t("App.compose.addCommune")}
          >
            <MapPin size={22} color={Colors.primary} />
          </Pressable>
          <EmojiButton onPick={emoji.insert} />
          {!quoting && (
            <Pressable onPress={toKonbit} style={styles.tool} hitSlop={6} accessibilityLabel={t("App.compose.toKonbit")}>
              <Handshake size={22} color={Colors.primary} />
            </Pressable>
          )}
          <Text style={[styles.count, remaining < 20 && styles.countLow]}>{body.length > 0 ? remaining : ""}</Text>
        </View>

        <LinkedText
          style={styles.rules}
          text={t("App.compose.rules")}
          links={{ rules: { label: t("App.legal.communityRules"), url: COMMUNITY_RULES_URL } }}
        />
      </KeyboardScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  publish: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    overflow: "hidden",
  },
  publishDisabled: { opacity: 0.4 },
  publishText: { color: Colors.textInverse, fontWeight: "700", fontSize: 15 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  row: { flexDirection: "row", gap: 12 },
  input: { flex: 1, fontSize: 19, lineHeight: 27, color: Colors.text, minHeight: 120, textAlignVertical: "top", paddingTop: 6 },
  images: { flexDirection: "row", gap: 8 },
  imageWrap: { flex: 1, aspectRatio: 4 / 5, borderRadius: 16, overflow: "hidden", maxWidth: "100%" },
  image: { width: "100%", height: "100%" },
  removeImage: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  communeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.primary50,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  communeChipText: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
  error: { color: Colors.error, fontSize: 14 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  tool: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  toolDisabled: { opacity: 0.35 },
  count: { marginLeft: "auto", fontSize: 13, color: Colors.textMuted },
  countLow: { color: Colors.secondary, fontWeight: "700" },
  rules: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
});
