import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import * as Burnt from "burnt";
import Colors from "@/constants/Colors";
import { Text, TextInput } from "@/components/ui/Text";
import { useModerateUser } from "@/hooks/useAdmin";
import type { ContentType } from "@/lib/admin";
import { useI18n } from "@/lib/i18n";
import { ABUSE_REASONS, KonbitError, type AbuseReason } from "@/lib/konbits";

const RESTRICT_DAYS = [1, 3, 7, 30];
const NOTE_MAX = 500;

interface Props {
  userId: string;
  isAdmin: boolean;
  defaultReason?: AbuseReason;
  // Contenu à l'origine de la sanction (depuis un signalement).
  content?: { type: ContentType; id: number };
  onDone?: () => void;
}

// Avertir, restreindre (jours) ou suspendre (admin) un compte. La personne
// reçoit une notification avec le motif et le message facultatif.
export default function SanctionPanel({ userId, isAdmin, defaultReason, content, onDone }: Props) {
  const { t } = useI18n();
  const moderate = useModerateUser();
  const [reason, setReason] = useState<AbuseReason | null>(defaultReason ?? null);
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);

  function confirm(action: "warn" | "restrict" | "suspend") {
    if (!reason) {
      Burnt.toast({ title: t("App.admin.sanction.pickReason"), preset: "error" });
      return;
    }
    const label =
      action === "warn"
        ? t("App.admin.sanction.warn")
        : action === "restrict"
          ? t("App.admin.sanction.restrictFor", { days })
          : t("App.admin.sanction.suspend");
    Alert.alert(label, t(`App.admin.sanction.confirm.${action}`), [
      { text: t("App.cancel"), style: "cancel" },
      {
        text: label,
        style: action === "warn" ? "default" : "destructive",
        onPress: async () => {
          try {
            await moderate.mutateAsync({
              userId,
              action,
              reason,
              note: note.trim() || undefined,
              days: action === "restrict" ? days : undefined,
              content,
            });
            Burnt.toast({ title: t("App.admin.done"), preset: "done" });
            setNote("");
            onDone?.();
          } catch (e) {
            const code = e instanceof KonbitError ? e.code : "failed";
            Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>{t("App.admin.sanction.reason")}</Text>
      <View style={styles.chips}>
        {ABUSE_REASONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setReason(r)}
            style={[styles.chip, reason === r && styles.chipActive]}
            accessibilityState={{ selected: reason === r }}
          >
            <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>{t(`App.abuse.${r}`)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t("App.admin.sanction.note")}</Text>
      <TextInput
        value={note}
        onChangeText={(v) => setNote(v.slice(0, NOTE_MAX))}
        placeholder={t("App.admin.sanction.notePlaceholder")}
        placeholderTextColor={Colors.textMuted}
        multiline
        style={styles.input}
      />

      {moderate.isPending ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 8 }} />
      ) : (
        <>
          <Pressable onPress={() => confirm("warn")} style={styles.button} android_ripple={{ color: "rgba(0,0,0,0.05)" }}>
            <Text style={styles.buttonText}>{t("App.admin.sanction.warn")}</Text>
          </Pressable>

          <View style={styles.restrictRow}>
            <View style={styles.chips}>
              {RESTRICT_DAYS.map((d) => (
                <Pressable key={d} onPress={() => setDays(d)} style={[styles.chip, days === d && styles.chipActive]}>
                  <Text style={[styles.chipText, days === d && styles.chipTextActive]}>
                    {t("App.admin.sanction.days", { days: d })}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => confirm("restrict")}
              style={[styles.button, styles.warnButton]}
              android_ripple={{ color: "rgba(0,0,0,0.05)" }}
            >
              <Text style={[styles.buttonText, styles.warnText]}>{t("App.admin.sanction.restrictFor", { days })}</Text>
            </Pressable>
          </View>

          {isAdmin && (
            <Pressable
              onPress={() => confirm("suspend")}
              style={[styles.button, styles.dangerButton]}
              android_ripple={{ color: "rgba(255,255,255,0.2)" }}
            >
              <Text style={[styles.buttonText, styles.dangerText]}>{t("App.admin.sanction.suspend")}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 10 },
  label: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary50 },
  chipText: { fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: "top",
    color: Colors.text,
  },
  restrictRow: { gap: 8 },
  button: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 22,
    paddingVertical: 11,
    alignItems: "center",
    overflow: "hidden",
  },
  buttonText: { fontSize: 15, fontWeight: "700", color: Colors.text },
  warnButton: { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" },
  warnText: { color: "#92400E" },
  dangerButton: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  dangerText: { color: "#FFFFFF" },
});
