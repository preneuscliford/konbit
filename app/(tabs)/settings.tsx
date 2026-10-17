import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { Check, ChevronRight, LogOut, UserRound } from "lucide-react-native";
import Colors from "@/constants/Colors";
import AppHeader from "@/components/AppHeader";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { LANGUAGES, useI18n } from "@/lib/i18n";

// Paramètres : langue, compte, (notifications quand le flag
// "settings.notifications" sera activé et la fonction livrée). Le profil s'ouvre d'ici.
export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const { userId, profile, signOut } = useAuth();

  function confirmSignOut() {
    Alert.alert(t("App.settings.signOut"), undefined, [
      { text: t("App.cancel"), style: "cancel" },
      { text: t("App.settings.signOut"), style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <AppHeader title={t("App.settings.title")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>{t("App.settings.language")}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((l, i) => (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              style={[styles.row, i > 0 && styles.rowBorder]}
              android_ripple={{ color: "rgba(0,0,0,0.04)" }}
              accessibilityState={{ selected: language === l.code }}
            >
              <Text style={[styles.rowText, language === l.code && styles.selected]}>{l.label}</Text>
              {language === l.code && <Check size={18} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>{t("App.settings.account")}</Text>
        <View style={styles.card}>
          {userId && profile?.pseudo ? (
            <>
              <Pressable
                onPress={() => router.push({ pathname: "/user/[id]", params: { id: userId } })}
                style={styles.row}
                android_ripple={{ color: "rgba(0,0,0,0.04)" }}
              >
                <UserRound size={18} color={Colors.text} />
                <View style={styles.rowMain}>
                  <Text style={styles.rowText}>{t("App.settings.profile")}</Text>
                  <Text style={styles.rowSub}>{t("App.settings.signedInAs", { pseudo: profile.pseudo })}</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={confirmSignOut}
                style={[styles.row, styles.rowBorder]}
                android_ripple={{ color: "rgba(0,0,0,0.04)" }}
              >
                <LogOut size={18} color={Colors.secondary} />
                <Text style={[styles.rowText, styles.rowMain, { color: Colors.secondary }]}>
                  {t("App.settings.signOut")}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => router.push("/account")}
              style={styles.row}
              android_ripple={{ color: "rgba(0,0,0,0.04)" }}
            >
              <UserRound size={18} color={Colors.primary} />
              <Text style={[styles.rowText, styles.rowMain, styles.selected]}>
                {userId ? t("App.account.pseudoTitle") : t("App.settings.signIn")}
              </Text>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>{t("App.settings.about")}</Text>
        <View style={[styles.card, styles.about]}>
          <Text style={styles.paragraph}>{t("App.settings.aboutText")}</Text>
          <Text style={styles.muted}>{t("App.dataSource")}</Text>
        </View>

        <Text style={styles.version}>
          Konbit 509 · {t("App.version", { version: Constants.expoConfig?.version ?? "" })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
  content: { padding: 16, gap: 8 },
  section: { fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", marginTop: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: "#EEEEE8", overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E5E7EB" },
  rowMain: { flex: 1 },
  rowText: { fontSize: 16, color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textMuted },
  selected: { color: Colors.primary, fontWeight: "700" },
  about: { padding: 16, gap: 10 },
  paragraph: { fontSize: 14, lineHeight: 21, color: Colors.textLight },
  muted: { fontSize: 12, color: Colors.textMuted },
  version: { textAlign: "center", fontSize: 12, color: Colors.textMuted, marginTop: 16 },
});
