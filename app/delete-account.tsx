import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Burnt from "burnt";
import { TriangleAlert, X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import LinkedText from "@/components/ui/LinkedText";
import PasswordInput from "@/components/ui/PasswordInput";
import { Text } from "@/components/ui/Text";
import { AuthError, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ACCOUNT_DELETION_URL } from "@/lib/legal";

// Suppression du compte : irréversible, donc reconfirmée par le mot de passe
// (compte e-mail) ou par Google (compte Google). Le serveur revérifie.
export default function DeleteAccountScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId, hasPassword, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!userId) return <Redirect href="/" />;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await deleteAccount(hasPassword ? { password } : { google: true });
      Burnt.toast({ title: t("App.profile.deleted"), preset: "done" });
      router.dismissAll();
    } catch (e) {
      const code = e instanceof AuthError ? e.code : "failed";
      if (code !== "cancelled") {
        setError(
          code === "invalid_credentials"
            ? t(hasPassword ? "App.deleteAccount.wrongPassword" : "App.deleteAccount.wrongGoogle")
            : code === "offline"
              ? t("App.account.errors.offline")
              : t("App.account.errors.failed"),
        );
      }
      setBusy(false);
    }
  }

  const disabled = busy || (hasPassword && password.length === 0);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconCircle}>
          <TriangleAlert size={28} color={Colors.secondary} />
        </View>
        <Text style={styles.title}>{t("App.profile.deleteAccount")}</Text>
        <Text style={styles.text}>{t("App.profile.deleteConfirm")}</Text>
        <LinkedText
          style={styles.small}
          text={t("App.deleteAccount.more")}
          links={{ more: { label: t("App.profile.deleteInfoLink"), url: ACCOUNT_DELETION_URL } }}
        />

        <Text style={styles.label}>
          {t(hasPassword ? "App.deleteAccount.passwordLabel" : "App.deleteAccount.googleLabel")}
        </Text>
        {hasPassword && (
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder={t("App.account.password")}
            autoComplete="current-password"
            autoFocus
          />
        )}

        <Pressable
          onPress={submit}
          disabled={disabled}
          style={[styles.danger, disabled && styles.disabled]}
          android_ripple={{ color: "rgba(255,255,255,0.25)" }}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : hasPassword ? (
            <Text style={styles.dangerText}>{t("App.deleteAccount.confirm")}</Text>
          ) : (
            <View style={styles.googleRow}>
              <Image source={require("@/assets/icons/logo-google.svg")} style={styles.googleLogo} />
              <Text style={styles.dangerText}>{t("App.deleteAccount.confirmGoogle")}</Text>
            </View>
          )}
        </Pressable>
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={() => router.back()} style={styles.cancel} hitSlop={8}>
          <Text style={styles.cancelText}>{t("App.cancel")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  iconCircle: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, textAlign: "center" },
  text: { fontSize: 15, lineHeight: 22, color: Colors.textLight, textAlign: "center" },
  small: { fontSize: 12, lineHeight: 18, color: Colors.textMuted, textAlign: "center" },
  label: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 8 },
  danger: {
    backgroundColor: Colors.secondary,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  dangerText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  googleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  googleLogo: { width: 20, height: 20, backgroundColor: "#FFFFFF", borderRadius: 10 },
  error: { color: Colors.error, textAlign: "center", fontSize: 14 },
  cancel: { alignSelf: "center", paddingVertical: 6 },
  cancelText: { fontSize: 15, fontWeight: "600", color: Colors.primary },
});
