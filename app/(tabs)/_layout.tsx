import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Handshake, House, Plus, Settings, Store } from "lucide-react-native";
import Colors from "@/constants/Colors";
import { useI18n } from "@/lib/i18n";

// Barre du bas façon X : Accueil, Konbit (écran d'ouverture), +, Biznis, Paramètres.
// (Décision du 13 novembre 2026 : Biznis remplace Signalement dans la barre.)
export default function TabLayout() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.tabIconDefault,
        tabBarLabelStyle: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
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
        name="biznis"
        options={{
          title: t("App.tabs.business"),
          tabBarIcon: ({ color, size }) => <Store color={color} size={size} />,
        }}
      />
      {/* Signalement : retiré de la barre, l'écran reste disponible. */}
      <Tabs.Screen name="signalement" options={{ href: null }} />
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
