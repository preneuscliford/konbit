import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import { CalendarDays, Ellipsis, ImagePlus, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import Avatar from "@/components/konbit509/Avatar";
import RestrictionBanner, { useRestriction } from "@/components/konbit509/RestrictionBanner";
import LinkedText from "@/components/ui/LinkedText";
import { Text, TextInput } from "@/components/ui/Text";
import { useCommunes } from "@/hooks/useKonbit";
import { useFlags } from "@/hooks/useKonbits";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { COMMUNITY_RULES_URL } from "@/lib/legal";
import { compressImage, type CompressedImage } from "@/lib/imageCompression";
import {
  createKonbit,
  KONBIT_KINDS,
  KONBIT_MAX_LENGTH,
  KonbitError,
  MAX_IMAGES,
  uploadKonbitImage,
  type KonbitKind,
} from "@/lib/konbits";

// Créer un konbit : texte court, commune, type (Diskisyon par défaut),
// jusqu'à 2 images compressées, "Pibliye". Type et images sont pilotés par
// les feature flags compose.kind et compose.media ; la date attend derrière "…".
export default function ComposeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPost, profile, userId } = useAuth();
  const communes = useCommunes();
  const isEnabled = useFlags();

  const [body, setBody] = useState("");
  const [communeSlug, setCommuneSlug] = useState(profile?.commune_slug ?? "");
  const [kind, setKind] = useState<KonbitKind>("discussion");
  const [images, setImages] = useState<CompressedImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Commune préremplie depuis le profil, modifiable.
  useEffect(() => {
    if (!communeSlug && profile?.commune_slug) setCommuneSlug(profile.commune_slug);
  }, [profile?.commune_slug, communeSlug]);

  if (!canPost) return <Redirect href="/account" />;

  const showKind = isEnabled("compose.kind");
  const showMedia = isEnabled("compose.media");
  const remaining = KONBIT_MAX_LENGTH - body.length;
  const restriction = useRestriction();
  const canSubmit = body.trim().length > 0 && !!communeSlug && !sending && !preparing && !restriction.blocked;

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
      await createKonbit(body, communeSlug, kind, media);
      await queryClient.invalidateQueries({ queryKey: ["konbits"] });
      Burnt.toast({ title: t("App.compose.published"), preset: "done" });
      router.back();
    } catch (e) {
      setError(t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`));
      setSending(false);
    }
  }

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
          {sending && <ActivityIndicator size="small" color="#FFFFFF" />}
          <Text style={styles.publishText}>{sending ? t("App.compose.publishing") : t("App.compose.publish")}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <RestrictionBanner message={restriction.message} />
          <View style={styles.editorRow}>
            <Avatar
              pseudo={profile?.pseudo ?? null}
              name={profile?.display_name}
              avatarPath={profile?.avatar_path}
              seed={userId ?? ""}
            />
            <TextInput
              value={body}
              onChangeText={(text) => setBody(text.slice(0, KONBIT_MAX_LENGTH))}
              placeholder={t("App.compose.placeholder")}
              placeholderTextColor={Colors.textMuted}
              maxLength={KONBIT_MAX_LENGTH}
              multiline
              autoFocus
              style={styles.input}
            />
          </View>

          {images.length > 0 && (
            <View style={styles.previews}>
              {images.map((image, index) => (
                <View key={image.uri} style={styles.preview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                    style={styles.removeImage}
                    hitSlop={8}
                    accessibilityLabel={t("App.compose.removeImage")}
                  >
                    <X size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          {preparing && <ActivityIndicator color={Colors.primary} style={{ alignSelf: "flex-start" }} />}

          {showKind && (
            <View style={styles.kinds}>
              {KONBIT_KINDS.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.kind, kind === k && styles.kindActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kind === k }}
                >
                  <Text style={[styles.kindText, kind === k && styles.kindTextActive]}>{t(`App.kinds.${k}`)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <CommunePicker
            communes={communes.data ?? []}
            value={communeSlug}
            onChange={setCommuneSlug}
            placeholder={t("Konbit.communePlaceholder")}
            compact
          />

          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              {showMedia && (
                <Pressable
                  onPress={pickImages}
                  disabled={images.length >= MAX_IMAGES || preparing}
                  hitSlop={10}
                  style={[styles.toolButton, images.length >= MAX_IMAGES && styles.toolDisabled]}
                  accessibilityLabel={t("App.compose.addImages", { max: MAX_IMAGES })}
                >
                  <ImagePlus size={22} color={Colors.primary} />
                </Pressable>
              )}
              <Pressable
                onPress={() => setShowMore((v) => !v)}
                hitSlop={10}
                style={styles.toolButton}
                accessibilityLabel={t("App.compose.more")}
              >
                <Ellipsis size={22} color={Colors.primary} />
              </Pressable>
            </View>
            <Text style={[styles.counter, remaining < 20 && styles.counterWarn]}>{remaining}</Text>
          </View>

          {showMore && (
            <View style={[styles.option, styles.optionDisabled]}>
              <CalendarDays size={16} color={Colors.textMuted} />
              <Text style={styles.optionText}>{t("App.compose.date")}</Text>
              <Text style={styles.soon}>{t("App.compose.comingSoon")}</Text>
            </View>
          )}

          {showMedia && images.length > 0 && (
            <Text style={styles.hint}>{t("App.compose.imagesHint", { count: images.length, max: MAX_IMAGES })}</Text>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
          <LinkedText
            style={styles.rules}
            text={t("App.compose.rules")}
            links={{ rules: { label: t("App.legal.communityRules"), url: COMMUNITY_RULES_URL } }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    overflow: "hidden",
  },
  publishDisabled: { opacity: 0.45 },
  publishText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  editorRow: { flexDirection: "row", gap: 12, minHeight: 120 },
  input: { flex: 1, fontSize: 18, lineHeight: 26, color: Colors.text, textAlignVertical: "top", paddingTop: 6 },
  previews: { flexDirection: "row", gap: 8, paddingLeft: 52 },
  preview: { flex: 1, maxWidth: 180, aspectRatio: 0.8, borderRadius: 12, overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  removeImage: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  kinds: { flexDirection: "row", gap: 8 },
  kind: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  kindActive: { borderColor: Colors.primary, backgroundColor: Colors.primary50 },
  kindText: { fontSize: 14, color: Colors.text },
  kindTextActive: { color: Colors.primary, fontWeight: "700" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  toolbarLeft: { flexDirection: "row", gap: 16 },
  toolButton: { padding: 4 },
  toolDisabled: { opacity: 0.35 },
  counter: { fontSize: 13, color: Colors.textMuted },
  rules: { fontSize: 12, lineHeight: 18, color: Colors.textMuted },
  counterWarn: { color: Colors.secondary, fontWeight: "700" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionDisabled: { opacity: 0.5 },
  optionText: { fontSize: 13, color: Colors.text },
  soon: { fontSize: 11, color: Colors.textMuted },
  hint: { fontSize: 12, color: Colors.textMuted },
  error: { fontSize: 14, color: Colors.error },
});
