import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Text";
import { useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react-native";
import Colors from "@/constants/Colors";
import fr from "@/i18n/fr.json";
import CategoryPicker from "@/components/konbit/CategoryPicker";
import CommunePicker, { ALL_COMMUNES } from "@/components/konbit/CommunePicker";
import { INCIDENTS_KEY, useCommunes, useUsdRate, useWeather } from "@/hooks/useKonbit";
import { bestUsdRate, submitReport } from "@/lib/api";
import { isInfoCategory, moduleOf, TONE_COLOR, UTILITY_CATEGORIES } from "@/lib/categories";
import { errorMessage, useI18n } from "@/lib/i18n";
import { useLocalState } from "@/lib/localState";

const NOTE_MAX_LENGTH = 140;

// Un seul formulaire pour les deux modules : le module se déduit de la
// catégorie, comme sur le web (konbit-report-form.tsx).
// onSubmitted : appelé après un envoi réussi (la fenêtre se referme).
export default function ReportForm({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { token, preferredCommune, rememberReport } = useLocalState();
  const communes = useCommunes();
  const rate = useUsdRate();
  const weather = useWeather();

  const [category, setCategory] = useState(UTILITY_CATEGORIES[0]);
  const [communeSlug, setCommuneSlug] = useState(preferredCommune === ALL_COMMUNES ? "" : preferredCommune);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const isSecurity = moduleOf(category) === "security";
  const isInfo = isInfoCategory(category);

  // Aperçu de la note que le serveur calcule lui-même (computeAutoNote) :
  // mêmes données, même format, en français comme côté serveur.
  const usd = bestUsdRate(rate.data);
  const w = weather.data;
  const infoPreview =
    category === "rate-snapshot" && usd
      ? `1 USD = ${usd.toFixed(2)} HTG`
      : category === "weather-snapshot" && w
        ? `${w.city.name} : ${Math.round(Number(w.tempC))}°C, ${
            (fr.App.weather as Record<string, string>)[w.condition] ?? w.condition
          }`
        : null;

  async function handleSubmit() {
    if (!communeSlug) {
      setFeedback({ ok: false, message: t("Konbit.communeRequired") });
      return;
    }
    setFeedback(null);
    setSending(true);
    try {
      const res = await submitReport({
        module: moduleOf(category),
        category,
        tokenId: token,
        communeSlug,
        // Ignorée par le serveur pour les catégories "info du jour".
        note: isInfo ? undefined : note.trim() || undefined,
      });
      rememberReport(res.reportId, res.incidentId);
      setNote("");
      setFeedback({ ok: true, message: t("Konbit.reportSentMessage") });
      await queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
      onSubmitted?.();
    } catch (e) {
      setFeedback({ ok: false, message: errorMessage(t, e, "report") });
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>

      <CategoryPicker
        value={category}
        onChange={(next) => {
          setCategory(next);
          setFeedback(null);
        }}
      />

      <CommunePicker
        communes={communes.data ?? []}
        value={communeSlug}
        onChange={setCommuneSlug}
        placeholder={t("Konbit.communePlaceholder")}
      />

      {isInfo ? (
        <View style={styles.infoPreview}>
          <Text style={styles.infoPreviewText}>{infoPreview ?? t("Konbit.infoPreviewUnavailable")}</Text>
          <Text style={styles.hint}>{t("Konbit.infoAutoNote")}</Text>
        </View>
      ) : (
        <View>
          <TextInput
            value={note}
            onChangeText={(text) => setNote(text.slice(0, NOTE_MAX_LENGTH))}
            placeholder={t("Konbit.notePlaceholder")}
            placeholderTextColor={Colors.textMuted}
            maxLength={NOTE_MAX_LENGTH}
            multiline
            style={styles.noteInput}
          />
          <Text style={styles.counter}>
            {note.length}/{NOTE_MAX_LENGTH}
          </Text>
        </View>
      )}

      {isSecurity && (
        <View style={styles.warning}>
          <TriangleAlert size={18} color={TONE_COLOR.police} />
          <Text style={styles.warningText}>{t("Konbit.tacticalInfoWarning")}</Text>
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={sending}
        // Style fixe, pas de fonction ({ pressed }) => … : NativeWind (css-interop)
        // ignore les styles en fonction sur Pressable et le bouton devenait invisible.
        style={[styles.submit, sending && styles.submitDimmed]}
        android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        accessibilityRole="button"
      >
        {sending && <ActivityIndicator color="#FFFFFF" />}
        <Text style={styles.submitText}>{sending ? t("Konbit.submitting") : t("Konbit.submit")}</Text>
      </Pressable>

      {feedback && (
        <Text style={[styles.feedback, { color: feedback.ok ? TONE_COLOR.ok : Colors.error }]}>
          {feedback.message}
        </Text>
      )}

      <Text style={styles.privacy}>{t("Konbit.privacyNote")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEEEE8",
  },
  infoPreview: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, gap: 6 },
  infoPreviewText: { fontSize: 15, fontWeight: "600", color: Colors.text },
  hint: { fontSize: 12, color: Colors.textMuted },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    minHeight: 64,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  warning: { flexDirection: "row", gap: 10, backgroundColor: "#FEF3C7", borderRadius: 12, padding: 12 },
  warningText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 18 },
  submit: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 15,
    overflow: "hidden",
  },
  submitDimmed: { opacity: 0.8 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  feedback: { fontSize: 14, fontWeight: "600" },
  privacy: { fontSize: 12, color: Colors.textMuted },
});
