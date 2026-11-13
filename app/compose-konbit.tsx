import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import * as Burnt from "burnt";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { CalendarDays, ImagePlus, MapPin, Users, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import RestrictionBanner, { useRestriction } from "@/components/konbit509/RestrictionBanner";
import KeyboardScroll from "@/components/ui/KeyboardScroll";
import { Text, TextInput } from "@/components/ui/Text";
import { useCommunes } from "@/hooks/useKonbit";
import { useNow } from "@/hooks/useNow";
import { useAuth } from "@/lib/auth";
import { compressImage, type CompressedImage } from "@/lib/imageCompression";
import { useI18n } from "@/lib/i18n";
import { createKonbit, KonbitError, MAX_IMAGES, uploadKonbitImage } from "@/lib/konbits";
import {
  addDays,
  defaultStart,
  endOfHaitiDay,
  formatKonbitDate,
  formatKonbitRange,
  fromPickerDate,
  toPickerDate,
} from "@/lib/konbitTime";

type Duration = "day" | "week" | "month" | "custom";
const DURATIONS: { value: Duration; days: number }[] = [
  { value: "day", days: 0 },
  { value: "week", days: 6 },
  { value: "month", days: 29 },
  { value: "custom", days: 0 },
];
const STEPS = ["what", "where", "when", "who"] as const;
const DESCRIPTION_MAX = 1000;

// Lancer un konbit (action collective) en 4 étapes : Kisa, Ki kote, Kilè,
// Ki moun. Ouvert depuis un pòs (icône 🤝), il reprend son texte, ses photos
// et sa commune.
export default function ComposeKonbitScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPost, profile, userId } = useAuth();
  const communes = useCommunes();
  const restriction = useRestriction();
  const now = useNow();
  const params = useLocalSearchParams<{ body?: string; commune?: string; images?: string }>();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(params.body ?? "");
  const [images, setImages] = useState<CompressedImage[]>(() => {
    try {
      return params.images ? (JSON.parse(params.images) as CompressedImage[]) : [];
    } catch {
      return [];
    }
  });
  const [commune, setCommune] = useState(params.commune || profile?.commune_slug || "");
  const [address, setAddress] = useState("");
  const [start, setStart] = useState(() => defaultStart(now));
  const [duration, setDuration] = useState<Duration>("day");
  const [customEnd, setCustomEnd] = useState(() => endOfHaitiDay(addDays(defaultStart(now), 1)));
  const [picker, setPicker] = useState<"start" | "end" | null>(null);
  const [limited, setLimited] = useState(false);
  const [max, setMax] = useState("20");
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canPost) return <Redirect href="/account" />;

  const end =
    duration === "custom"
      ? customEnd
      : endOfHaitiDay(addDays(start, DURATIONS.find((d) => d.value === duration)!.days));
  const maxNumber = Number(max);
  const communeName = communes.data?.find((c) => c.slug === commune)?.name ?? "";

  function check(s: number): string | null {
    if (s === 0) {
      if (title.trim().length < 3) return t("App.composeKonbit.errors.name");
      if (!body.trim()) return t("App.composeKonbit.errors.description");
    }
    if (s === 1 && !commune) return t("App.composeKonbit.errors.commune");
    if (s === 2) {
      if (start.getTime() < now - 3_600_000) return t("App.composeKonbit.errors.past");
      if (end.getTime() <= start.getTime()) return t("App.composeKonbit.errors.end");
      if (end.getTime() - start.getTime() > 365 * 86_400_000) return t("App.composeKonbit.errors.long");
    }
    if (s === 3 && limited && (!Number.isInteger(maxNumber) || maxNumber < 2 || maxNumber > 10000)) {
      return t("App.composeKonbit.errors.max");
    }
    return null;
  }

  function next() {
    const problem = check(step);
    if (problem) return setError(problem);
    setError(null);
    setStep((s) => s + 1);
  }

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
    setPreparing(true);
    try {
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

  async function launch() {
    const problem = [0, 1, 2, 3].map(check).find(Boolean);
    if (problem || !userId) return setError(problem ?? null);
    setError(null);
    setSending(true);
    try {
      const media = await Promise.all(images.map((image) => uploadKonbitImage(userId, image)));
      const id = await createKonbit(body, commune, "konbit", media, {
        title: title.trim(),
        address_detail: address.trim() || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        max_participants: limited ? maxNumber : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["konbits"] });
      Burnt.toast({ title: t("App.composeKonbit.launched"), preset: "done" });
      router.replace({ pathname: "/konbit/[id]", params: { id: String(id) } });
    } catch (e) {
      setError(t(`App.konbitErrors.${e instanceof KonbitError ? e.code : "failed"}`));
      setSending(false);
    }
  }

  const chip = (active: boolean) => [styles.chip, active && styles.chipActive];
  const chipText = (active: boolean) => [styles.chipText, active && styles.chipTextActive];

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>{t("App.composeKonbit.title")}</Text>
        <Pressable
          onPress={() => router.replace("/compose")}
          hitSlop={8}
          style={{ marginLeft: "auto" }}
          accessibilityRole="link"
        >
          <Text style={styles.simplePost}>{t("App.composeKonbit.simplePost")}</Text>
        </Pressable>
      </View>

      {/* Barre de progression des 4 étapes */}
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepItem}>
            <View style={[styles.stepBar, i <= step && styles.stepBarActive]} />
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>
              {i + 1}. {t(`App.composeKonbit.steps.${s}`)}
            </Text>
          </View>
        ))}
      </View>

      <KeyboardScroll contentContainerStyle={styles.content}>
        {restriction.blocked && <RestrictionBanner message={restriction.message} />}

        {step === 0 && (
          <>
            <Text style={styles.h2}>{t("App.composeKonbit.whatTitle")}</Text>
            <Text style={styles.label}>{t("App.composeKonbit.name")} *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              placeholder={t("App.composeKonbit.namePlaceholder")}
              style={styles.input}
              autoFocus
            />
            <Text style={styles.label}>{t("App.composeKonbit.description")} *</Text>
            <TextInput
              value={body}
              onChangeText={(text) => setBody(text.slice(0, DESCRIPTION_MAX))}
              maxLength={DESCRIPTION_MAX}
              placeholder={t("App.composeKonbit.descriptionPlaceholder")}
              multiline
              style={[styles.input, styles.textarea]}
            />
            <Text style={styles.counter}>
              {body.length}/{DESCRIPTION_MAX}
            </Text>
            <View style={styles.images}>
              {images.map((img) => (
                <View key={img.uri} style={styles.thumb}>
                  <Image source={{ uri: img.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable
                    onPress={() => setImages((list) => list.filter((i) => i.uri !== img.uri))}
                    style={styles.removeImage}
                    hitSlop={6}
                    accessibilityLabel={t("App.compose.removeImage")}
                  >
                    <X size={14} color={Colors.textInverse} />
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES && (
                <Pressable onPress={pickImages} style={styles.addThumb} accessibilityLabel={t("App.compose.addImage")}>
                  {preparing ? <ActivityIndicator color={Colors.primary} /> : <ImagePlus size={22} color={Colors.primary} />}
                </Pressable>
              )}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.h2}>{t("App.composeKonbit.whereTitle")}</Text>
            <Text style={styles.label}>{t("App.composeKonbit.commune")} *</Text>
            <CommunePicker
              communes={(communes.data ?? []).filter((c) => c.slug !== "national")}
              value={commune}
              onChange={setCommune}
              placeholder={t("App.composeKonbit.commune")}
            />
            <Text style={styles.label}>{t("App.composeKonbit.address")}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              maxLength={120}
              placeholder={t("App.composeKonbit.addressPlaceholder")}
              style={styles.input}
            />
            <Text style={styles.hint}>{t("App.composeKonbit.addressHint")}</Text>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h2}>{t("App.composeKonbit.whenTitle")}</Text>
            <Text style={styles.label}>{t("App.composeKonbit.start")} *</Text>
            <Pressable onPress={() => setPicker("start")} style={styles.dateButton} accessibilityRole="button">
              <CalendarDays size={18} color={Colors.primary} />
              <Text style={styles.dateText}>{formatKonbitDate(start.toISOString(), language)}</Text>
            </Pressable>
            <Text style={styles.label}>{t("App.composeKonbit.duration")} *</Text>
            <View style={styles.chips}>
              {DURATIONS.map((d) => (
                <Pressable key={d.value} onPress={() => setDuration(d.value)} style={chip(duration === d.value)}>
                  <Text style={chipText(duration === d.value)}>{t(`App.composeKonbit.durations.${d.value}`)}</Text>
                </Pressable>
              ))}
            </View>
            {duration === "custom" && (
              <>
                <Text style={styles.label}>{t("App.composeKonbit.lastDay")} *</Text>
                <Pressable onPress={() => setPicker("end")} style={styles.dateButton} accessibilityRole="button">
                  <CalendarDays size={18} color={Colors.primary} />
                  <Text style={styles.dateText}>{formatKonbitDate(customEnd.toISOString(), language, false)}</Text>
                </Pressable>
              </>
            )}
            <View style={styles.summary}>
              <Text style={styles.summaryText}>🗓 {formatKonbitRange(start.toISOString(), end.toISOString(), language)}</Text>
              <Text style={styles.hint}>{t("App.composeKonbit.haitiTime")}</Text>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.h2}>{t("App.composeKonbit.whoTitle")}</Text>
            <View style={styles.chips}>
              <Pressable onPress={() => setLimited(false)} style={chip(!limited)}>
                <Text style={chipText(!limited)}>{t("App.composeKonbit.noLimit")}</Text>
              </Pressable>
              <Pressable onPress={() => setLimited(true)} style={chip(limited)}>
                <Text style={chipText(limited)}>{t("App.composeKonbit.limit")}</Text>
              </Pressable>
            </View>
            {limited && (
              <>
                <Text style={styles.label}>{t("App.composeKonbit.max")}</Text>
                <TextInput
                  value={max}
                  onChangeText={(text) => setMax(text.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  maxLength={5}
                  style={[styles.input, { width: 120 }]}
                />
              </>
            )}

            <View style={styles.preview}>
              <Text style={styles.previewLabel}>{t("App.composeKonbit.preview")}</Text>
              <Text style={styles.previewTitle}>{title}</Text>
              <View style={styles.previewLine}>
                <CalendarDays size={14} color={Colors.textMuted} />
                <Text style={styles.previewText}>{formatKonbitRange(start.toISOString(), end.toISOString(), language)}</Text>
              </View>
              <View style={styles.previewLine}>
                <MapPin size={14} color={Colors.textMuted} />
                <Text style={styles.previewText}>
                  {communeName}
                  {address.trim() ? ` · ${address.trim()}` : ""}
                </Text>
              </View>
              <View style={styles.previewLine}>
                <Users size={14} color={Colors.textMuted} />
                <Text style={styles.previewText}>
                  {limited ? t("App.composeKonbit.maxPeople", { max: max || "?" }) : t("App.composeKonbit.anyone")}
                </Text>
              </View>
              <Text style={styles.previewBody} numberOfLines={3}>
                {body}
              </Text>
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.nav}>
          {step > 0 ? (
            <Pressable
              onPress={() => {
                setError(null);
                setStep((s) => s - 1);
              }}
              style={styles.back}
            >
              <Text style={styles.backText}>← {t("App.composeKonbit.back")}</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            onPress={step < STEPS.length - 1 ? next : launch}
            disabled={sending || preparing || restriction.blocked}
            style={[styles.primary, (sending || preparing || restriction.blocked) && styles.disabled]}
            android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            accessibilityRole="button"
          >
            {sending && <ActivityIndicator size="small" color={Colors.textInverse} />}
            <Text style={styles.primaryText}>
              {step < STEPS.length - 1
                ? `${t("App.composeKonbit.next")} →`
                : sending
                  ? t("App.composeKonbit.launching")
                  : t("App.composeKonbit.launch")}
            </Text>
          </Pressable>
        </View>
      </KeyboardScroll>

      {/* Sélecteurs de date du téléphone : affichés et saisis à l'heure d'Haïti. */}
      <DateTimePickerModal
        isVisible={picker === "start"}
        mode="datetime"
        date={toPickerDate(start)}
        minimumDate={toPickerDate(new Date(now))}
        isDarkModeEnabled={Colors.isDark}
        onConfirm={(picked) => {
          const next = fromPickerDate(picked);
          setStart(next);
          if (customEnd.getTime() <= next.getTime()) setCustomEnd(endOfHaitiDay(addDays(next, 1)));
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
      <DateTimePickerModal
        isVisible={picker === "end"}
        mode="date"
        date={toPickerDate(customEnd)}
        minimumDate={toPickerDate(start)}
        isDarkModeEnabled={Colors.isDark}
        onConfirm={(picked) => {
          setCustomEnd(endOfHaitiDay(fromPickerDate(picked)));
          setPicker(null);
        }}
        onCancel={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  simplePost: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" },
  steps: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  stepItem: { flex: 1, gap: 5 },
  stepBar: { height: 5, borderRadius: 3, backgroundColor: Colors.border },
  stepBarActive: { backgroundColor: Colors.primary },
  stepLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  stepLabelActive: { color: Colors.primary },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 10 },
  h2: { fontSize: 20, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "700", color: Colors.textLight, marginTop: 6 },
  hint: { fontSize: 12, color: Colors.textMuted },
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
  textarea: { minHeight: 120, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontSize: 12, color: Colors.textMuted },
  images: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  thumb: { width: 92, height: 92, borderRadius: 14, overflow: "hidden" },
  addThumb: {
    width: 92,
    height: 92,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImage: {
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
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateText: { fontSize: 16, color: Colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: "700", color: Colors.textLight },
  chipTextActive: { color: Colors.textInverse },
  summary: { backgroundColor: Colors.surfaceMuted, borderRadius: 14, padding: 14, gap: 2, marginTop: 6 },
  summaryText: { fontSize: 15, color: Colors.text },
  preview: { borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 14, gap: 5, marginTop: 10 },
  previewLabel: { fontSize: 11, fontWeight: "800", color: Colors.textMuted, textTransform: "uppercase" },
  previewTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  previewLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewText: { flex: 1, fontSize: 14, color: Colors.textLight },
  previewBody: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  error: { color: Colors.error, fontSize: 14 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  back: { paddingHorizontal: 8, paddingVertical: 10 },
  backText: { fontSize: 15, fontWeight: "700", color: Colors.textMuted },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 12,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: Colors.textInverse, fontWeight: "800", fontSize: 15 },
});
