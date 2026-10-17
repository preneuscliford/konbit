import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { INCIDENTS_KEY } from "@/hooks/useKonbit";
import { deleteReport, voteIncident, type KonbitIncident, type VoteStance } from "@/lib/api";
import { categoryMeta, TONE_COLOR } from "@/lib/categories";
import { categoryLabel, errorMessage, formatRelative, useI18n } from "@/lib/i18n";
import { useLocalState } from "@/lib/localState";

// Réactions émoji volontairement absentes de la v1 (cachées pour plus tard).
export default function IncidentCard({ incident }: { incident: KonbitIncident }) {
  const { t, language } = useI18n();
  const { token, votes, rememberVote, myReportFor, forgetReport } = useLocalState();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<VoteStance | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { emoji, Icon, tone } = categoryMeta(incident.category);
  const color = TONE_COLOR[tone];
  const isSecurity = incident.module === "security";
  const myReportId = myReportFor(incident.id);
  const myVote = votes[incident.id];

  async function handleVote(stance: VoteStance) {
    setError(null);
    setBusy(stance);
    try {
      const res = await voteIncident(incident.id, stance, token);
      if (res.outcome === "own-report") {
        setError(t("Konbit.cannotVoteOwnReport"));
        return;
      }
      queryClient.setQueryData<KonbitIncident[]>(INCIDENTS_KEY, (list) =>
        list?.map((i) =>
          i.id === incident.id ? { ...i, confirmCount: res.confirmCount, disputeCount: res.disputeCount } : i,
        ),
      );
      rememberVote(incident.id, stance);
    } catch (e) {
      setError(errorMessage(t, e, "vote"));
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    if (!myReportId) return;
    Alert.alert(t("Konbit.deleteButton"), t("Konbit.deleteConfirmPrompt"), [
      { text: t("App.cancel"), style: "cancel" },
      { text: t("Konbit.deleteButton"), style: "destructive", onPress: () => handleDelete(myReportId) },
    ]);
  }

  async function handleDelete(reportId: number) {
    setError(null);
    setBusy("delete");
    try {
      await deleteReport(reportId, token);
      forgetReport(reportId);
      await queryClient.invalidateQueries({ queryKey: INCIDENTS_KEY });
    } catch (e) {
      setError(errorMessage(t, e, "delete"));
      setBusy(null);
    }
  }

  return (
    <View style={[styles.card, isSecurity && styles.cardSecurity]}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: `${color}1A` }]}>
          <Icon size={22} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {emoji} {categoryLabel(t, incident.category)}
          </Text>
          <Text style={styles.meta}>
            {incident.communeSlug === "national" ? t("App.national") : incident.communeName} ·{" "}
            {formatRelative(incident.publishedAt, language)}
          </Text>
        </View>
        {isSecurity && (
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>⚠️ {t("Konbit.moduleSecurity")}</Text>
          </View>
        )}
      </View>

      {incident.latestNote ? <Text style={styles.note}>“{incident.latestNote}”</Text> : null}

      {/* L'auteur voit les compteurs en lecture seule, sans pouvoir voter. */}
      {myReportId ? (
        <View style={styles.ownRow}>
          <Text style={styles.ownCounts}>
            ✅ {t("Konbit.trueVote")} · {incident.confirmCount}   ❌ {t("Konbit.falseVote")} · {incident.disputeCount}
          </Text>
          <Text style={styles.ownNote}>{t("Konbit.ownReportNote")}</Text>
        </View>
      ) : (
        <View style={styles.voteRow}>
          <VoteButton
            label={`✅ ${t("Konbit.trueVote")} · ${incident.confirmCount}`}
            active={myVote === "confirm"}
            loading={busy === "confirm"}
            disabled={busy !== null}
            onPress={() => handleVote("confirm")}
          />
          <VoteButton
            label={`❌ ${t("Konbit.falseVote")} · ${incident.disputeCount}`}
            active={myVote === "dispute"}
            loading={busy === "dispute"}
            disabled={busy !== null}
            onPress={() => handleVote("dispute")}
          />
        </View>
      )}

      {/* Le nombre de confirmations n'est jamais une preuve, surtout pour une alerte. */}
      {isSecurity && <Text style={styles.unverified}>{t("Konbit.unverifiedNote")}</Text>}

      {myReportId ? (
        <Pressable onPress={confirmDelete} disabled={busy !== null} style={styles.deleteButton} hitSlop={8}>
          {busy === "delete" ? (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          ) : (
            <Trash2 size={15} color={Colors.textMuted} />
          )}
          <Text style={styles.deleteText}>{busy === "delete" ? t("Konbit.deleting") : t("Konbit.deleteButton")}</Text>
        </Pressable>
      ) : null}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function VoteButton({
  label,
  active,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ selected: active, disabled }}
      // Style fixe : NativeWind ignore les styles en fonction sur Pressable.
      style={[styles.voteButton, active && styles.voteButtonActive]}
      android_ripple={{ color: "rgba(0,32,159,0.12)", borderless: false }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Text style={[styles.voteText, active && styles.voteTextActive]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEEEE8",
  },
  cardSecurity: { borderLeftWidth: 4, borderLeftColor: TONE_COLOR.problem },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBubble: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  securityBadge: { backgroundColor: TONE_COLOR.problem, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  securityBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  note: { fontSize: 14, fontStyle: "italic", color: Colors.textLight },
  voteRow: { flexDirection: "row", gap: 8 },
  voteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    overflow: "hidden",
  },
  voteButtonActive: { backgroundColor: Colors.primary50, borderColor: Colors.primary },
  voteText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  voteTextActive: { color: Colors.primary },
  ownRow: { gap: 2 },
  ownCounts: { fontSize: 13, color: Colors.textMuted },
  ownNote: { fontSize: 12, fontStyle: "italic", color: Colors.textMuted },
  unverified: { fontSize: 12, color: Colors.textMuted },
  deleteButton: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  deleteText: { fontSize: 13, color: Colors.textMuted, fontWeight: "600" },
  error: { fontSize: 13, color: Colors.error },
});
