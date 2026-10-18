import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

// Cadre des écrans d'administration. Réservé à l'équipe (adminOnly : admin
// seulement) ; le serveur refuse de toute façon les autres comptes.
export default function AdminScreen({
  title,
  adminOnly = false,
  right,
  children,
}: {
  title: string;
  adminOnly?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { isModerator, isAdmin } = useAuth();

  if (!isModerator || (adminOnly && !isAdmin)) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
      {children}
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
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
});
