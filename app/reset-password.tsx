import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Burnt from "burnt";
import Colors from "@/constants/Colors";
import { Text, TextInput } from "@/components/ui/Text";
import { useSessionFromUrl } from "@/hooks/useSessionFromUrl";
import { AuthError, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const MIN_PASSWORD = 8;

// Arrivée depuis le lien "mot de passe oublié" : choisir un nouveau mot de passe.
export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const status = useSessionFromUrl();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (password.length < MIN_PASSWORD) {
      setError(t("App.account.passwordHint"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      Burnt.toast({ title: t("App.account.passwordUpdated"), preset: "done" });
      router.replace("/");
    } catch (e) {
      setError(
        e instanceof AuthError && e.code === "weak_password"
          ? t("App.account.errors.weak_password")
          : t("App.account.errors.failed"),
      );
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("App.account.newPasswordTitle")}</Text>
        {status === "pending" ? (
          <ActivityIndicator color={Colors.primary} />
        ) : status === "invalid" ? (
          <>
            <Text style={styles.text}>{t("App.account.linkInvalid")}</Text>
            <Pressable onPress={() => router.replace("/account")} style={styles.primary}>
              <Text style={styles.primaryText}>{t("App.account.backToSignIn")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t("App.account.newPassword")}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              autoFocus
              style={styles.input}
            />
            <Text style={styles.small}>{t("App.account.passwordHint")}</Text>
            <Pressable
              onPress={save}
              disabled={busy}
              style={[styles.primary, busy && styles.disabled]}
              android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{t("App.account.save")}</Text>}
            </Pressable>
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: 24, gap: 14 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, textAlign: "center" },
  text: { fontSize: 15, color: Colors.textLight, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  small: { fontSize: 12, color: Colors.textMuted },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: "center",
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  error: { color: Colors.error, textAlign: "center", fontSize: 14 },
});
