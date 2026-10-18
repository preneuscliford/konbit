import React from "react";
import { StyleSheet } from "react-native";
import { Text } from "@/components/ui/Text";
import { useI18n } from "@/lib/i18n";

// État d'un contenu modéré : masqué en attente (3 signalements) ou retiré.
export default function StatusBadge({ status }: { status: "visible" | "hidden" | "removed" }) {
  const { t } = useI18n();
  if (status === "visible") return null;
  return (
    <Text style={[styles.badge, status === "removed" && styles.removed]}>{t(`App.activity.status.${status}`)}</Text>
  );
}

const styles = StyleSheet.create({
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
  removed: { color: "#991B1B", backgroundColor: "#FEE2E2" },
});
