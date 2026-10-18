import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Burnt from "burnt";
import { Megaphone, Trash2 } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AdminScreen from "@/components/admin/AdminScreen";
import { Text, TextInput } from "@/components/ui/Text";
import { useAdminStats, useAnnouncements, useDeleteAnnouncement, useSendAnnouncement } from "@/hooks/useAdmin";
import { formatRelative, useI18n } from "@/lib/i18n";
import { KonbitError } from "@/lib/konbits";

const TITLE_MAX = 80;
const BODY_MAX = 500;

// Message à tous les comptes : notification dans l'app + push. Admin seulement.
export default function AdminAnnounce() {
  const { t, language } = useI18n();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const send = useSendAnnouncement();
  const stats = useAdminStats();
  const history = useAnnouncements();
  const remove = useDeleteAnnouncement();

  // Supprimée pour tout le monde : elle disparaît aussi de leurs notifications.
  function confirmDelete(id: number) {
    Alert.alert(t("App.admin.announce.delete"), t("App.admin.announce.deleteConfirm"), [
      { text: t("App.cancel"), style: "cancel" },
      {
        text: t("App.card.delete"),
        style: "destructive",
        onPress: () =>
          remove.mutate(id, {
            onSuccess: () => Burnt.toast({ title: t("App.admin.announce.deleted"), preset: "done" }),
            onError: (e) => {
              const code = e instanceof KonbitError ? e.code : "failed";
              Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
            },
          }),
      },
    ]);
  }

  const ready = title.trim().length > 0 && body.trim().length > 0;

  function confirmSend() {
    Alert.alert(
      t("App.admin.announce.send"),
      t("App.admin.announce.confirm", { count: stats.data?.accounts ?? "…" }),
      [
        { text: t("App.cancel"), style: "cancel" },
        {
          text: t("App.admin.announce.send"),
          onPress: async () => {
            try {
              const sent = await send.mutateAsync({ title, body });
              Burnt.toast({ title: t("App.admin.announce.sent", { count: sent }), preset: "done" });
              setTitle("");
              setBody("");
            } catch (e) {
              const code = e instanceof KonbitError ? e.code : "failed";
              Burnt.toast({ title: t(`App.konbitErrors.${code}`), preset: "error" });
            }
          },
        },
      ],
    );
  }

  return (
    <AdminScreen title={t("App.admin.announce.title")} adminOnly>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>{t("App.admin.announce.hint")}</Text>

        <View style={styles.fieldHeader}>
          <Text style={styles.label}>{t("App.admin.announce.titleLabel")}</Text>
          <Text style={styles.counter}>{TITLE_MAX - title.length}</Text>
        </View>
        <TextInput
          value={title}
          onChangeText={(v) => setTitle(v.slice(0, TITLE_MAX))}
          placeholder={t("App.admin.announce.titlePlaceholder")}
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />

        <View style={styles.fieldHeader}>
          <Text style={styles.label}>{t("App.admin.announce.bodyLabel")}</Text>
          <Text style={styles.counter}>{BODY_MAX - body.length}</Text>
        </View>
        <TextInput
          value={body}
          onChangeText={(v) => setBody(v.slice(0, BODY_MAX))}
          placeholder={t("App.admin.announce.bodyPlaceholder")}
          placeholderTextColor={Colors.textMuted}
          multiline
          style={[styles.input, styles.bodyInput]}
        />

        {ready && (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>{t("App.admin.announce.preview")}</Text>
            <View style={styles.previewCard}>
              <Megaphone size={18} color={Colors.primary} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.previewTitle}>{title.trim()}</Text>
                <Text style={styles.previewBody}>{body.trim()}</Text>
              </View>
            </View>
          </View>
        )}

        <Pressable
          onPress={confirmSend}
          disabled={!ready || send.isPending}
          style={[styles.send, (!ready || send.isPending) && styles.disabled]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
        >
          {send.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.sendText}>{t("App.admin.announce.send")}</Text>
          )}
        </Pressable>

        <Text style={styles.section}>{t("App.admin.announce.history")}</Text>
        {(history.data ?? []).length === 0 ? (
          <Text style={styles.hint}>{t("App.admin.announce.none")}</Text>
        ) : (
          history.data!.map((a) => (
            <View key={a.id} style={styles.historyRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.previewTitle}>{a.title}</Text>
                <Text style={styles.previewBody} numberOfLines={3}>
                  {a.body}
                </Text>
                <Text style={styles.counter}>{formatRelative(a.created_at, language)}</Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(a.id)}
                disabled={remove.isPending}
                hitSlop={10}
                accessibilityLabel={t("App.admin.announce.delete")}
              >
                <Trash2 size={20} color={Colors.secondary} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 19, color: Colors.textMuted },
  fieldHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  label: { fontSize: 14, fontWeight: "700", color: Colors.text },
  counter: { fontSize: 12, color: Colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  bodyInput: { minHeight: 110, textAlignVertical: "top" },
  preview: { gap: 6, marginTop: 6 },
  previewLabel: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
  previewCard: { flexDirection: "row", gap: 10, backgroundColor: Colors.primary50, borderRadius: 12, padding: 12 },
  previewTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  previewBody: { fontSize: 14, lineHeight: 20, color: Colors.textLight },
  send: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  sendText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  section: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", marginTop: 16 },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary50,
    paddingLeft: 10,
    marginBottom: 6,
  },
});
