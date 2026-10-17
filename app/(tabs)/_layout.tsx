import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Handshake, House, Megaphone, Plus, Settings } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { useI18n } from "@/lib/i18n";

// Barre du bas façon X : Accueil, Konbit (écran d'ouverture), +, Signalement, Paramètres.
export default function TabLayout() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: "#E5E7EB" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t("App.tabs.home"), tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="index"
        options={{ title: "Konbit", tabBarIcon: ({ color, size }) => <Handshake color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarAccessibilityLabel: t("App.compose.title"),
          // Le "+" n'est pas un onglet : il ouvre la fenêtre de création.
          tabBarButton: ({ style }) => (
            <View style={[style, styles.createSlot]}>
              <Pressable
                onPress={() => router.push("/compose")}
                style={styles.createButton}
                accessibilityRole="button"
                accessibilityLabel={t("App.compose.title")}
                android_ripple={{ color: "rgba(255,255,255,0.3)", borderless: true }}
              >
                <Plus color="#FFFFFF" size={28} strokeWidth={2.5} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="signalement"
        options={{
          title: t("App.tabs.report"),
          tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("App.tabs.settings"),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createSlot: { alignItems: "center", justifyContent: "center" },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
