import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { Text } from "@/components/ui/Text";
import { useUnreadCount } from "@/hooks/useSocial";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

// Cloche de l'en-tête (onglet Konbit) avec le nombre de notifications non lues.
export default function NotificationBell() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId } = useAuth();
  const unread = useUnreadCount();

  if (!userId) return null;
  const count = unread.data ?? 0;

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={t("App.notifications.title")}
    >
      <Bell size={22} color={Colors.text} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800", lineHeight: 12 },
});
