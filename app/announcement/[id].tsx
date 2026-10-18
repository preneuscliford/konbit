import React from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Burnt from "burnt";
import { ArrowLeft, Bell, Trash2 } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useAnnouncement, useDismissAnnouncement } from "@/hooks/useSocial";
import { useI18n } from "@/lib/i18n";

// Annonce de l'équipe en entier, ouverte depuis la cloche ou la notification
// push. Chacun peut l'effacer de ses notifications.
export default function AnnouncementScreen() {
  const { t, language } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const announcementId = Number(id);
  const announcement = useAnnouncement(announcementId);
  const dismiss = useDismissAnnouncement();
  const a = announcement.data;

  function confirmDismiss() {
    Alert.alert(t("App.notifications.delete"), t("App.announcement.deleteConfirm"), [
      { text: t("App.cancel"), style: "cancel" },
      {
        text: t("App.card.delete"),
        style: "destructive",
        onPress: () =>
          dismiss.mutate(announcementId, {
            onSuccess: () => {
              Burnt.toast({ title: t("App.announcement.deleted"), preset: "done" });
              router.back();
            },
            onError: () => Burnt.toast({ title: t("App.konbitErrors.failed"), preset: "error" }),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>{t("App.notifications.team")}</Text>
        {a && (
          <Pressable
            onPress={confirmDismiss}
            disabled={dismiss.isPending}
            hitSlop={12}
            accessibilityLabel={t("App.notifications.delete")}
          >
            {dismiss.isPending ? (
              <ActivityIndicator size="small" color={Colors.secondary} />
            ) : (
              <Trash2 size={22} color={Colors.secondary} />
            )}
          </Pressable>
        )}
      </View>

      {!a ? (
        announcement.isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <Text style={styles.empty}>{t("App.announcement.gone")}</Text>
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconCircle}>
            <Bell size={24} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{a.title}</Text>
          <Text style={styles.date}>
            {new Date(a.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "fr-HT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={styles.body} selectable>
            {a.body}
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
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
  topTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
  content: { padding: 24, gap: 10 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, marginTop: 6 },
  date: { fontSize: 13, color: Colors.textMuted },
  body: { fontSize: 16, lineHeight: 24, color: Colors.text, marginTop: 6 },
  empty: { textAlign: "center", color: Colors.textMuted, padding: 32 },
});
