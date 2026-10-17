import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Megaphone } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker, { ALL_COMMUNES } from "@/components/konbit/CommunePicker";
import IncidentCard from "@/components/konbit/IncidentCard";
import AppHeader from "@/components/AppHeader";
import OfflineBanner from "@/components/konbit/OfflineBanner";
import { useCommunes, useIncidents } from "@/hooks/useKonbit";
import type { KonbitModule } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLocalState } from "@/lib/localState";

type ModuleFilter = "all" | KonbitModule;

// Onglet Signalement : le module de haitiscope.com/konbit. Les derniers
// signalements en premier ; le formulaire s'ouvre depuis le bouton "Siyale"
// de l'en-tête (app/report-incident.tsx). L'info du jour est sur l'Accueil.
// Anonyme : jamais lié au compte Konbit (voir lib/localState.tsx).
export default function SignalementScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { preferredCommune, setPreferredCommune } = useLocalState();
  const incidents = useIncidents();
  const communes = useCommunes();
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Le flux national est affiché par défaut ; la commune n'est qu'une
  // préférence locale. Aucune géolocalisation, par décision produit.
  const visible = useMemo(
    () =>
      (incidents.data ?? [])
        .filter((i) => preferredCommune === ALL_COMMUNES || i.communeSlug === preferredCommune)
        .filter((i) => moduleFilter === "all" || i.module === moduleFilter),
    [incidents.data, preferredCommune, moduleFilter],
  );

  async function onRefresh() {
    setRefreshing(true);
    await incidents.refetch();
    setRefreshing(false);
  }

  const modules: { value: ModuleFilter; label: string }[] = [
    { value: "all", label: t("Konbit.allModules") },
    { value: "utility", label: t("Konbit.moduleUtility") },
    { value: "security", label: `⚠️ ${t("Konbit.moduleSecurity")}` },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader
        action={
          <Pressable
            onPress={() => router.push("/report-incident")}
            style={styles.reportButton}
            android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            accessibilityRole="button"
            accessibilityLabel={t("Konbit.reportTitle")}
          >
            <Megaphone size={15} color="#FFFFFF" />
            <Text style={styles.reportButtonText}>{t("App.reportButton")}</Text>
          </Pressable>
        }
      />
      <OfflineBanner />

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <IncidentCard incident={item} />}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.feedTitle}>{t("Konbit.feedTitle")}</Text>

            <View style={styles.chips}>
              {modules.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => setModuleFilter(m.value)}
                  style={[styles.chip, moduleFilter === m.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, moduleFilter === m.value && styles.chipTextActive]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            <CommunePicker
              communes={communes.data ?? []}
              value={preferredCommune}
              onChange={setPreferredCommune}
              allowAll
              compact
              placeholder={t("Konbit.allCommunes")}
            />
          </View>
        }
        ListEmptyComponent={
          incidents.isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : incidents.isError && !incidents.data ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t("App.loadError")}</Text>
              <Pressable onPress={() => incidents.refetch()} style={styles.retry}>
                <Text style={styles.retryText}>{t("App.retry")}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.emptyText, { marginTop: 16 }]}>{t("Konbit.noIncidents")}</Text>
          )
        }
        ListFooterComponent={
          <Text style={styles.footer}>
            {t("App.dataSource")}
            {"\n"}Konbit 509 · {t("App.version", { version: Constants.expoConfig?.version ?? "" })}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  list: { padding: 16, paddingBottom: 32 },
  header: { gap: 14, marginBottom: 12 },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    overflow: "hidden",
  },
  reportButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  feedTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.text },
  chipTextActive: { color: "#FFFFFF" },
  empty: { alignItems: "center", gap: 12, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  retry: { backgroundColor: Colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  footer: { fontSize: 11, color: Colors.textMuted, textAlign: "center", marginTop: 24, lineHeight: 16 },
});
