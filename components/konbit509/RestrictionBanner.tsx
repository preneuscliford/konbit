import React from "react";
import { StyleSheet, View } from "react-native";
import { ShieldAlert } from "lucide-react-native";
import { Text } from "@/components/ui/Text";
import { useMyModerationStatus } from "@/hooks/useAdmin";
import { useI18n } from "@/lib/i18n";

// Compte restreint ou suspendu : impossible de publier / répondre (le serveur
// refuse de toute façon). blocked sert à désactiver le bouton d'envoi.
export function useRestriction() {
  const { t, language } = useI18n();
  const status = useMyModerationStatus().data;
  if (status?.suspended) return { blocked: true, message: t("App.restriction.suspended") };
  if (status?.restrictedUntil) {
    const date = new Date(status.restrictedUntil).toLocaleDateString(language === "fr" ? "fr-FR" : "fr-HT", {
      day: "numeric",
      month: "long",
    });
    return { blocked: true, message: t("App.restriction.restricted", { date }) };
  }
  return { blocked: false, message: null };
}

export default function RestrictionBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.banner}>
      <ShieldAlert size={18} color="#991B1B" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
  },
  text: { flex: 1, fontSize: 13, lineHeight: 19, color: "#991B1B" },
});
