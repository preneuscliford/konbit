import React, { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import StatusBadge from "@/components/admin/StatusBadge";
import { Text } from "@/components/ui/Text";
import { useModerationQueue } from "@/hooks/useAdmin";
import type { QueueItem } from "@/lib/admin";
import { formatRelative, useI18n } from "@/lib/i18n";

// Contenus signalés en attente de décision, du plus signalé au moins signalé.
export default function AdminReports() {
  const { t } = useI18n();
  const queue = useModerationQueue();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await queue.refetch();
    setRefreshing(false);
  }

  return (
    <AdminScreen title={t("App.admin.reports.title")}>
      <FlatList
        data={queue.data ?? []}
        keyExtractor={(item) => `${item.target_type}-${item.target_id}`}
        renderItem={({ item }) => <QueueRow item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          queue.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : queue.isError ? (
            <Text style={styles.empty}>{t("App.loadError")}</Text>
          ) : (
            <Text style={styles.empty}>{t("App.admin.reports.empty")}</Text>
          )
        }
      />
    </AdminScreen>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const author = item.author_name || item.author_pseudo || "…";

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/admin/report", params: { type: item.target_type, id: String(item.target_id) } })
      }
      style={styles.row}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.meta}>
          <Text style={styles.type}>{t(`App.admin.reports.type.${item.target_type}`)}</Text>
          <Text style={styles.count}>{t("App.admin.reports.count", { count: item.report_count })}</Text>
          {item.status && item.status !== "visible" && <StatusBadge status={item.status} />}
        </View>
        <Text style={styles.body} numberOfLines={3}>
          {item.body ?? t("App.admin.reports.deleted")}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {author} · {item.reasons.map((r) => t(`App.abuse.${r}`)).join(", ")} ·{" "}
          {formatRelative(item.last_reported_at, language)}
        </Text>
      </View>
      <ChevronRight size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0EB",
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  type: { fontSize: 12, fontWeight: "800", color: Colors.primary, textTransform: "uppercase" },
  count: { fontSize: 12, fontWeight: "700", color: Colors.secondary },
  body: { fontSize: 15, lineHeight: 21, color: Colors.text },
  small: { fontSize: 12, color: Colors.textMuted },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
