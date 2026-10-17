import React from "react";
import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/app/provider/AuthProvider";
import { useUnreadKonbitNotifications } from "@/lib/konbitServices";
import Colors from "@/constants/Colors";

const NotificationBell = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { data: unreadCount } = useUnreadKonbitNotifications(user?.id || "");

  if (!user?.id) return null;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(community)/notifications")}
      style={styles.button}
      hitSlop={8}
    >
      <Bell size={24} color={Colors.text} />
      {!!unreadCount && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default NotificationBell;
