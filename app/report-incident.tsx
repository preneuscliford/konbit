import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Burnt from "burnt";
import { X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import ReportForm from "@/components/konbit/ReportForm";
import { Text } from "@/components/ui/Text";
import { useI18n } from "@/lib/i18n";

// Formulaire du Signalement HaïtiScope, ouvert depuis le bouton "Siyale" de
// l'onglet Signalement. Se referme après l'envoi : le signalement apparaît
// en tête de la liste.
export default function ReportIncidentScreen() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t("Konbit.reportTitle")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>{t("Konbit.intro")}</Text>
          <ReportForm
            onSubmitted={() => {
              Burnt.toast({ title: t("App.reportSent"), preset: "done" });
              router.back();
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  content: { padding: 16, gap: 14 },
  intro: { fontSize: 14, lineHeight: 20, color: Colors.textLight },
});
