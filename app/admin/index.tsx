import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { ChevronRight, Flag, Megaphone, Users, type LucideIcon } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import DailyBars from "@/components/admin/DailyBars";
import { Text } from "@/components/ui/Text";
import { useAdminStats, usePendingCount } from "@/hooks/useAdmin";
import { shortDay } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

// Tableau de bord : chiffres clés et activité des 14 derniers jours (admin),
// accès aux signalements, aux comptes et aux annonces.
export default function AdminHome() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const stats = useAdminStats();
  const pending = usePendingCount();
  const [refreshing, setRefreshing] = useState(false);
  const s = stats.data;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([stats.refetch(), pending.refetch()]);
    setRefreshing(false);
  }

  const menu: { key: string; icon: LucideIcon; label: string; badge: number; href: Href }[] = [
    { key: "reports", icon: Flag, label: t("App.admin.reports.title"), badge: pending.data ?? 0, href: "/admin/reports" },
    { key: "users", icon: Users, label: t("App.admin.users.title"), badge: 0, href: "/admin/users" },
    ...(isAdmin
      ? [{ key: "announce", icon: Megaphone, label: t("App.admin.announce.title"), badge: 0, href: "/admin/announce" as Href }]
      : []),
  ];

  return (
    <AdminScreen title={t("App.admin.title")}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.card}>
          {menu.map((item, i) => (
            <Pressable
              key={item.key}
              onPress={() => router.push(item.href)}
              style={[styles.row, i > 0 && styles.rowBorder]}
              android_ripple={{ color: "rgba(0,0,0,0.04)" }}
            >
              <item.icon size={18} color={Colors.text} />
              <Text style={styles.rowText}>{item.label}</Text>
              {item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {isAdmin && (
          <>
            {stats.isLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
            ) : stats.isError || !s ? (
              <Text style={styles.muted}>{t("App.loadError")}</Text>
            ) : (
              <>
                <Group
                  title={t("App.admin.stats.accounts")}
                  tiles={[
                    [t("App.admin.stats.total"), s.accounts],
                    [t("App.admin.stats.new7d"), s.accounts_new_7d],
                    [t("App.admin.stats.active24h"), s.accounts_active_24h],
                    [t("App.admin.stats.active7d"), s.accounts_active_7d],
                  ]}
                />
                <Group
                  title={t("App.admin.stats.devices")}
                  hint={t("App.admin.stats.devicesHint")}
                  tiles={[
                    [t("App.admin.stats.today"), s.installs_today],
                    [t("App.admin.stats.days7"), s.installs_7d],
                    [t("App.admin.stats.days30"), s.installs_30d],
                  ]}
                />
                <DailyBars
                  title={t("App.admin.stats.dailyActive")}
                  days={s.daily.map((d) => ({ day: d.day, value: d.active }))}
                  formatDay={shortDay}
                />
                <DailyBars
                  title={t("App.admin.stats.dailySignups")}
                  days={s.daily.map((d) => ({ day: d.day, value: d.signups }))}
                  formatDay={shortDay}
                />
                <Group
                  title={t("App.admin.stats.content")}
                  tiles={[
                    [t("App.admin.stats.konbitsVisible"), s.konbits_total],
                    [t("App.admin.stats.konbits7d"), s.konbits_7d],
                    [t("App.admin.stats.replies7d"), s.replies_7d],
                  ]}
                />
                <Group
                  title={t("App.admin.stats.moderation")}
                  tiles={[
                    [t("App.admin.stats.reportsOpen"), s.reports_open],
                    [t("App.admin.stats.restricted"), s.restricted],
                    [t("App.admin.stats.suspended"), s.suspended],
                    [t("App.admin.stats.deletions30d"), s.deletions_30d],
                  ]}
                />
                <Text style={styles.muted}>{t("App.admin.stats.deletionsTotal", { count: s.deletions_total })}</Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </AdminScreen>
  );
}

function Group({ title, hint, tiles }: { title: string; hint?: string; tiles: [string, number][] }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {hint && <Text style={styles.hint}>{hint}</Text>}
      <View style={styles.tiles}>
        {tiles.map(([label, value]) => (
          <View key={label} style={styles.tile}>
            <Text style={styles.tileValue}>{value}</Text>
            <Text style={styles.tileLabel} numberOfLines={2}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: "#EEEEE8", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  rowText: { flex: 1, fontSize: 16, color: Colors.text },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: -4 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 76,
    borderWidth: 1,
    borderColor: "#EEEEE8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 2,
  },
  tileValue: { fontSize: 20, fontWeight: "800", color: Colors.text },
  tileLabel: { fontSize: 11, color: Colors.textMuted },
  muted: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
});
