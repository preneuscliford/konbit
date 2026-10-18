import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Burnt from "burnt";
import { ChevronRight, ExternalLink } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import SanctionPanel from "@/components/admin/SanctionPanel";
import StatusBadge from "@/components/admin/StatusBadge";
import Avatar from "@/components/konbit509/Avatar";
import KonbitImages from "@/components/konbit509/KonbitImages";
import { Text } from "@/components/ui/Text";
import { useModerateContent, useModerationQueue } from "@/hooks/useAdmin";
import type { QueueItem } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import { KonbitError } from "@/lib/konbits";

// Un contenu signalé : le lire en entier, l'ouvrir dans l'app, décider
// (garder ou retirer), puis éventuellement sanctionner son auteur.
export default function AdminReport() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { type, id } = useLocalSearchParams<{ type: "konbit" | "reply"; id: string }>();
  const queue = useModerationQueue();
  const moderate = useModerateContent();
  // Gardé à l'écran après la décision (il quitte alors la file).
  const [snapshot, setSnapshot] = useState<QueueItem | null>(null);
  const [decided, setDecided] = useState<"remove" | "restore" | null>(null);

  const fromQueue = queue.data?.find((q) => q.target_type === type && String(q.target_id) === id) ?? null;
  const item = snapshot ?? fromQueue;
  if (fromQueue && !snapshot) setSnapshot(fromQueue);

  function decide(decision: "remove" | "restore") {
    if (!item) return;
    Alert.alert(
      t(decision === "remove" ? "App.admin.report.remove" : "App.admin.report.keep"),
      t(decision === "remove" ? "App.admin.report.removeConfirm" : "App.admin.report.keepConfirm"),
      [
        { text: t("App.cancel"), style: "cancel" },
        {
          text: t(decision === "remove" ? "App.admin.report.remove" : "App.admin.report.keep"),
          style: decision === "remove" ? "destructive" : "default",
          onPress: async () => {
            try {
              await moderate.mutateAsync({
                type: item.target_type,
                id: item.target_id,
                decision,
                reason: decision === "remove" ? item.reasons[0] : undefined,
              });
              setDecided(decision);
              Burnt.toast({ title: t("App.admin.done"), preset: "done" });
            } catch (e) {
              const code = e instanceof KonbitError ? e.code : "failed";
              Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
            }
          },
        },
      ],
    );
  }

  const openInApp =
    item && item.konbit_id && (item.target_type === "reply" || item.status === "visible") && decided !== "remove";

  return (
    <AdminScreen title={t("App.admin.report.title")}>
      {!item ? (
        queue.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.empty}>{t("App.admin.report.gone")}</Text>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.meta}>
            <Text style={styles.type}>{t(`App.admin.reports.type.${item.target_type}`)}</Text>
            <Text style={styles.count}>{t("App.admin.reports.count", { count: item.report_count })}</Text>
            {item.status && <StatusBadge status={decided === "remove" ? "removed" : decided ? "visible" : item.status} />}
          </View>
          <Text style={styles.small}>
            {item.reasons.map((r) => t(`App.abuse.${r}`)).join(", ")} · {formatRelative(item.last_reported_at, language)}
          </Text>

          <View style={styles.contentCard}>
            <Text style={styles.body}>{item.body ?? t("App.admin.reports.deleted")}</Text>
            {item.media.length > 0 && <KonbitImages media={item.media} />}
          </View>

          {openInApp && (
            <Pressable
              onPress={() => router.push({ pathname: "/konbit/[id]", params: { id: String(item.konbit_id) } })}
              style={styles.linkRow}
            >
              <ExternalLink size={16} color={Colors.primary} />
              <Text style={styles.link}>{t("App.admin.report.openInApp")}</Text>
            </Pressable>
          )}

          {item.author_id && (
            <Pressable
              onPress={() => router.push({ pathname: "/admin/user/[id]", params: { id: item.author_id! } })}
              style={styles.authorRow}
              android_ripple={{ color: "rgba(0,0,0,0.04)" }}
            >
              <Avatar
                pseudo={item.author_pseudo}
                name={item.author_name}
                avatarPath={item.author_avatar}
                seed={item.author_id}
                size={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.authorName}>{item.author_name || item.author_pseudo}</Text>
                {item.author_pseudo && <Text style={styles.small}>@{item.author_pseudo}</Text>}
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          )}

          <Text style={styles.section}>{t("App.admin.report.decision")}</Text>
          {decided ? (
            <Text style={styles.decided}>
              {t(decided === "remove" ? "App.admin.report.removed" : "App.admin.report.kept")}
            </Text>
          ) : moderate.isPending ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={styles.decisionRow}>
              <Pressable onPress={() => decide("restore")} style={[styles.decision, styles.keep]}>
                <Text style={styles.keepText}>{t("App.admin.report.keep")}</Text>
              </Pressable>
              <Pressable onPress={() => decide("remove")} style={[styles.decision, styles.remove]}>
                <Text style={styles.removeText}>{t("App.admin.report.remove")}</Text>
              </Pressable>
            </View>
          )}

          {item.author_id && (
            <>
              <Text style={styles.section}>{t("App.admin.report.sanctionAuthor")}</Text>
              <Text style={styles.small}>{t("App.admin.report.sanctionHint")}</Text>
              <SanctionPanel
                userId={item.author_id}
                isAdmin={isAdmin}
                defaultReason={item.reasons[0]}
                content={{ type: item.target_type, id: item.target_id }}
              />
            </>
          )}
        </ScrollView>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  type: { fontSize: 12, fontWeight: "800", color: Colors.primary, textTransform: "uppercase" },
  count: { fontSize: 12, fontWeight: "700", color: Colors.secondary },
  small: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  contentCard: { borderWidth: 1, borderColor: "#EEEEE8", borderRadius: 14, padding: 14, gap: 10 },
  body: { fontSize: 16, lineHeight: 23, color: Colors.text },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  link: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEEEE8",
    borderRadius: 14,
    padding: 12,
    overflow: "hidden",
  },
  authorName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  section: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", marginTop: 8 },
  decisionRow: { flexDirection: "row", gap: 10 },
  decision: { flex: 1, borderRadius: 22, paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  keep: { borderColor: "#D1D5DB" },
  keepText: { fontSize: 15, fontWeight: "700", color: Colors.text },
  remove: { borderColor: Colors.secondary, backgroundColor: Colors.secondary },
  removeText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  decided: { fontSize: 14, fontWeight: "700", color: Colors.success },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
