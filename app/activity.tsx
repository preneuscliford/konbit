import React, { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import * as Burnt from "burnt";
import { ArrowLeft, ChevronRight, Flag, Heart, Trash2, Users } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import {
  useActivitySummary,
  useMyKonbitRefs,
  useMyKonbits,
  useMyReplies,
  useRemoveActivity,
} from "@/hooks/useActivity";
import type { ActivitySection, KonbitRef, ModerationStatus, MyKonbit, MyReply } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { formatRelative, useI18n } from "@/lib/i18n";
import { KonbitError } from "@/lib/konbits";

const SECTIONS: ActivitySection[] = ["konbits", "replies", "joined", "liked"];

type Row =
  | { section: "konbits"; item: MyKonbit }
  | { section: "replies"; item: MyReply }
  | { section: "joined" | "liked"; item: KonbitRef };

// « Aktivite mwen » : vue d'ensemble de ce que l'utilisateur a fait, et
// suppression élément par élément (jamais tout d'un coup).
export default function ActivityScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId } = useAuth();
  const [section, setSection] = useState<ActivitySection>("konbits");
  const [refreshing, setRefreshing] = useState(false);

  const summary = useActivitySummary();
  const konbits = useMyKonbits();
  const replies = useMyReplies(section === "replies");
  const joined = useMyKonbitRefs("joined", section === "joined");
  const liked = useMyKonbitRefs("liked", section === "liked");
  const current = { konbits, replies, joined, liked }[section];

  if (!userId) return <Redirect href="/account" />;

  const rows: Row[] =
    section === "konbits"
      ? (konbits.data ?? []).map((item) => ({ section, item }))
      : section === "replies"
        ? (replies.data ?? []).map((item) => ({ section, item }))
        : ((section === "joined" ? joined.data : liked.data) ?? []).map((item) => ({ section, item }));

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([summary.refetch(), current.refetch()]);
    setRefreshing(false);
  }

  const s = summary.data;
  const header = (
    <View style={styles.header}>
      <View style={styles.tiles}>
        {SECTIONS.map((key) => (
          <Pressable
            key={key}
            onPress={() => setSection(key)}
            style={[styles.tile, section === key && styles.tileActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === key }}
          >
            <Text style={[styles.tileCount, section === key && styles.tileCountActive]}>{s ? s[key] : "–"}</Text>
            <Text style={[styles.tileLabel, section === key && styles.tileLabelActive]} numberOfLines={1}>
              {t(`App.activity.sections.${key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {s && (
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Heart size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>
              {t("App.activity.received", {
                participants: s.receivedParticipants,
                likes: s.receivedLikes,
                replies: s.receivedReplies,
              })}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: "/user/[id]/follows", params: { id: userId, tab: "following" } })}
            style={[styles.infoRow, styles.infoBorder]}
            android_ripple={{ color: "rgba(0,0,0,0.04)" }}
          >
            <Users size={16} color={Colors.textMuted} />
            <Text style={[styles.infoText, { flex: 1 }]}>
              {t("App.activity.follows", { following: s.following, followers: s.followers })}
            </Text>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>
          <View style={[styles.infoRow, styles.infoBorder]}>
            <Flag size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{t("App.activity.reportsSent", { count: s.reportsSent })}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t(`App.activity.sections.${section}`)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title}>{t("App.activity.title")}</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) =>
          row.section === "konbits" || row.section === "replies"
            ? `${row.section}-${row.item.id}`
            : `${row.section}-${row.item.konbit?.id}`
        }
        renderItem={({ item }) => <ActivityRow row={item} />}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          current.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : current.isError ? (
            <Text style={styles.empty}>{t("App.loadError")}</Text>
          ) : (
            <Text style={styles.empty}>{t(`App.activity.empty.${section}`)}</Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function ActivityRow({ row }: { row: Row }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const remove = useRemoveActivity();
  const [busy, setBusy] = useState(false);

  const konbitId =
    row.section === "konbits" ? row.item.id : row.section === "replies" ? row.item.konbit?.id : row.item.konbit?.id;
  const body = row.section === "konbits" || row.section === "replies" ? row.item.body : row.item.konbit?.body ?? "";
  const status: ModerationStatus | null =
    row.section === "konbits" || row.section === "replies" ? row.item.status : null;

  async function run() {
    setBusy(true);
    try {
      if (row.section === "konbits") await remove.mutateAsync({ section: "konbits", konbit: row.item });
      else if (row.section === "replies") await remove.mutateAsync({ section: "replies", id: row.item.id });
      else await remove.mutateAsync({ section: row.section, konbitId: row.item.konbit!.id });
      if (row.section === "konbits" || row.section === "replies") {
        Burnt.toast({ title: t("App.activity.deleted"), preset: "done" });
      }
    } catch (e) {
      const code = e instanceof KonbitError ? e.code : "failed";
      Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
      setBusy(false);
    }
  }

  // Supprimer un konbit ou une réponse est définitif : on confirme. Quitter
  // un konbit ou retirer un J'aime se refait en un geste : pas de confirmation.
  function onAction() {
    if (row.section === "konbits" || row.section === "replies") {
      Alert.alert(
        t("App.card.delete"),
        t(row.section === "konbits" ? "App.activity.deleteKonbitConfirm" : "App.activity.deleteReplyConfirm"),
        [
          { text: t("App.cancel"), style: "cancel" },
          { text: t("App.card.delete"), style: "destructive", onPress: run },
        ],
      );
    } else {
      run();
    }
  }

  const actionLabel =
    row.section === "joined" ? t("App.activity.leave") : row.section === "liked" ? t("App.activity.unlike") : null;

  return (
    <Pressable
      onPress={() => konbitId && router.push({ pathname: "/konbit/[id]", params: { id: String(konbitId) } })}
      style={styles.row}
      android_ripple={{ color: "rgba(0,0,0,0.04)" }}
      // Un konbit masqué par la modération ne s'ouvre pas dans le fil.
      disabled={!konbitId || (status !== null && status !== "visible")}
    >
      <View style={{ flex: 1, gap: 4 }}>
        {row.section === "replies" && row.item.konbit && (
          <Text style={styles.context} numberOfLines={1}>
            {t("App.activity.replyOn", { body: row.item.konbit.body })}
          </Text>
        )}
        {(row.section === "joined" || row.section === "liked") && row.item.konbit?.author && (
          <Text style={styles.context} numberOfLines={1}>
            {row.item.konbit.author.display_name || row.item.konbit.author.pseudo}
          </Text>
        )}
        <Text style={styles.body} numberOfLines={3}>
          {body}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatRelative(row.item.created_at, language)}</Text>
          {row.section === "konbits" && (
            <Text style={styles.meta}>
              · {t("App.activity.konbitStats", {
                participants: row.item.participant_count,
                likes: row.item.like_count,
                replies: row.item.reply_count,
              })}
            </Text>
          )}
          {status && status !== "visible" && (
            <Text style={[styles.badge, status === "removed" && styles.badgeRemoved]}>
              {t(`App.activity.status.${status}`)}
            </Text>
          )}
        </View>
      </View>

      <Pressable
        onPress={onAction}
        disabled={busy}
        hitSlop={8}
        style={actionLabel ? styles.textAction : styles.iconAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel ?? t("App.card.delete")}
      >
        {busy ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : actionLabel ? (
          <Text style={styles.textActionLabel}>{actionLabel}</Text>
        ) : (
          <Trash2 size={20} color={Colors.secondary} />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  header: { padding: 16, gap: 14 },
  tiles: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 2,
  },
  tileActive: { borderColor: Colors.primary, backgroundColor: Colors.primary50 },
  tileCount: { fontSize: 20, fontWeight: "800", color: Colors.text },
  tileCountActive: { color: Colors.primary },
  tileLabel: { fontSize: 12, color: Colors.textMuted },
  tileLabelActive: { color: Colors.primary, fontWeight: "700" },
  card: { borderRadius: 14, borderWidth: 1, borderColor: "#EEEEE8", overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  infoBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  infoText: { fontSize: 13, lineHeight: 19, color: Colors.textLight, flexShrink: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F0F0EB",
  },
  context: { fontSize: 12, color: Colors.textMuted },
  body: { fontSize: 15, lineHeight: 21, color: Colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  meta: { fontSize: 12, color: Colors.textMuted },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  badgeRemoved: { color: "#991B1B", backgroundColor: "#FEE2E2" },
  iconAction: { padding: 6 },
  textAction: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  textActionLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
