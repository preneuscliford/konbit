import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { useI18n } from "@/lib/i18n";

export default function OfflineBanner() {
  const { t } = useI18n();
  const { isConnected, isInternetReachable } = useNetInfo();

  // null = état encore inconnu au démarrage : on n'affiche rien.
  if (isConnected !== false && isInternetReachable !== false) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#FFFFFF" />
      <Text style={styles.text}>{t("App.offline")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4B5563",
    paddingVertical: 6,
  },
  text: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
