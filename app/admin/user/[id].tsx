import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Burnt from "burnt";
import { ExternalLink } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import SanctionPanel from "@/components/admin/SanctionPanel";
import Avatar from "@/components/konbit509/Avatar";
import { Text } from "@/components/ui/Text";
import { useAdminUser, useModerateUser, useSetUserRole } from "@/hooks/useAdmin";
import type { UserRole } from "@/lib/admin";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import { KonbitError } from "@/lib/konbits";

const ASSIGNABLE_ROLES: Exclude<UserRole, "admin">[] = ["user", "tester", "moderator"];

// Fiche d'un compte pour l'équipe : état, chiffres, historique des décisions,
// sanctions ; rôle et e-mail pour l'admin seulement.
export default function AdminUserScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, isAdmin } = useAuth();
  const user = useAdminUser(id);
  const lift = useModerateUser();
  const setRole = useSetUserRole();
  const u = user.data;

  const restricted = u?.restricted_until && new Date(u.restricted_until) > new Date();
  const isSelf = u?.id === userId;
  // Un modérateur ne peut pas sanctionner un autre membre de l'équipe.
  const canSanction = u && !isSelf && u.role !== "admin" && (isAdmin || u.role !== "moderator");

  const dateText = (iso: string) =>
    new Date(iso).toLocaleDateString(language === "fr" ? "fr-FR" : "fr-HT", { day: "numeric", month: "long" });

  async function run(task: () => Promise<unknown>) {
    try {
      await task();
      Burnt.toast({ title: t("App.admin.done"), preset: "done" });
    } catch (e) {
      const code = e instanceof KonbitError ? e.code : "failed";
      Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
    }
  }

  function confirmLift() {
    Alert.alert(t("App.admin.user.lift"), t("App.admin.user.liftConfirm"), [
      { text: t("App.cancel"), style: "cancel" },
      { text: t("App.admin.user.lift"), onPress: () => run(() => lift.mutateAsync({ userId: id, action: "lift" })) },
    ]);
  }

  function confirmRole(role: Exclude<UserRole, "admin">) {
    Alert.alert(t("App.admin.user.role"), t("App.admin.user.roleConfirm", { role: t(`App.admin.roles.${role}`) }), [
      { text: t("App.cancel"), style: "cancel" },
      { text: t("App.admin.user.roleApply"), onPress: () => run(() => setRole.mutateAsync({ userId: id, role })) },
    ]);
  }

  return (
    <AdminScreen title={u?.pseudo ? `@${u.pseudo}` : t("App.admin.users.title")}>
      {!u ? (
        user.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.empty}>{t("App.loadError")}</Text>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Avatar pseudo={u.pseudo} name={u.display_name} avatarPath={u.avatar_path} seed={u.id} size={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{u.display_name || u.pseudo}</Text>
              {u.pseudo && <Text style={styles.small}>@{u.pseudo}</Text>}
              {u.email && <Text style={styles.small}>{u.email}</Text>}
              <Text style={styles.small}>
                {t(`App.admin.roles.${u.role}`)} · {t("App.admin.user.since", { date: dateText(u.created_at) })}
              </Text>
              <Text style={styles.small}>
                {u.last_seen_at
                  ? t("App.admin.user.lastSeen", { when: formatRelative(u.last_seen_at, language) })
                  : t("App.admin.user.neverSeen")}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push({ pathname: "/user/[id]", params: { id: u.id } })}
            style={styles.linkRow}
          >
            <ExternalLink size={16} color={Colors.primary} />
            <Text style={styles.link}>{t("App.admin.user.openProfile")}</Text>
          </Pressable>

          {(u.suspended_at || restricted) && (
            <View style={[styles.status, u.suspended_at ? styles.statusRed : styles.statusAmber]}>
              <Text style={[styles.statusText, u.suspended_at ? styles.statusTextRed : styles.statusTextAmber]}>
                {u.suspended_at
                  ? t("App.admin.user.suspendedSince", { date: dateText(u.suspended_at) })
                  : t("App.admin.user.restrictedUntil", { date: dateText(u.restricted_until!) })}
              </Text>
              {/* Lever une sanction : admin seulement (vérifié aussi par le serveur). */}
              {isAdmin &&
                (lift.isPending ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Pressable onPress={confirmLift} hitSlop={8}>
                    <Text style={styles.link}>{t("App.admin.user.lift")}</Text>
                  </Pressable>
                ))}
            </View>
          )}

          <View style={styles.tiles}>
            {(
              [
                [t("App.activity.sections.konbits"), u.konbits],
                [t("App.activity.sections.replies"), u.replies],
                [t("App.admin.user.reportsReceived"), u.reports_received],
              ] as [string, number][]
            ).map(([label, value]) => (
              <View key={label} style={styles.tile}>
                <Text style={styles.tileValue}>{value}</Text>
                <Text style={styles.tileLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {isAdmin && !isSelf && u.role !== "admin" && (
            <>
              <Text style={styles.section}>{t("App.admin.user.role")}</Text>
              <View style={styles.chips}>
                {ASSIGNABLE_ROLES.map((role) => (
                  <Pressable
                    key={role}
                    onPress={() => role !== u.role && confirmRole(role)}
                    style={[styles.chip, u.role === role && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, u.role === role && styles.chipTextActive]}>
                      {t(`App.admin.roles.${role}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {canSanction && (
            <>
              <Text style={styles.section}>{t("App.admin.user.sanction")}</Text>
              <SanctionPanel userId={u.id} isAdmin={isAdmin} />
            </>
          )}

          <Text style={styles.section}>{t("App.admin.user.history")}</Text>
          {u.actions.length === 0 ? (
            <Text style={styles.small}>{t("App.admin.user.noHistory")}</Text>
          ) : (
            u.actions.map((a) => (
              <View key={a.id} style={styles.historyRow}>
                <Text style={styles.historyAction}>
                  {t(`App.admin.actions.${a.action}`)}
                  {a.reason ? ` · ${t(`App.abuse.${a.reason}`)}` : ""}
                  {a.until ? ` · ${t("App.admin.user.until", { date: dateText(a.until) })}` : ""}
                </Text>
                {a.note && <Text style={styles.historyNote}>« {a.note} »</Text>}
                <Text style={styles.small}>{formatRelative(a.created_at, language)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  name: { fontSize: 18, fontWeight: "800", color: Colors.text },
  small: { fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  link: { fontSize: 14, fontWeight: "700", color: Colors.primary },
  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  statusAmber: { backgroundColor: "#FFFBEB" },
  statusRed: { backgroundColor: "#FEF2F2" },
  statusText: { flex: 1, fontSize: 14, fontWeight: "700" },
  statusTextAmber: { color: "#92400E" },
  statusTextRed: { color: "#991B1B" },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, borderWidth: 1, borderColor: "#EEEEE8", borderRadius: 12, padding: 10, gap: 2 },
  tileValue: { fontSize: 20, fontWeight: "800", color: Colors.text },
  tileLabel: { fontSize: 11, color: Colors.textMuted },
  section: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary50 },
  chipText: { fontSize: 13, color: Colors.text },
  chipTextActive: { color: Colors.primary, fontWeight: "700" },
  historyRow: { borderLeftWidth: 3, borderLeftColor: "#E5E7EB", paddingLeft: 10, gap: 2 },
  historyAction: { fontSize: 14, fontWeight: "700", color: Colors.text },
  historyNote: { fontSize: 13, color: Colors.textLight, fontStyle: "italic" },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
