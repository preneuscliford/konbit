import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import Colors from "@/constants/Colors";
import CommunePicker from "@/components/konbit/CommunePicker";
import { Text, TextInput } from "@/components/ui/Text";
import { useCommunes } from "@/hooks/useKonbit";
import { AuthError, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const PSEUDO_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

type EmailMode = "signIn" | "signUp" | "forgot";

// Connexion en deux temps : Google ou e-mail + mot de passe, puis pseudo
// public + commune par défaut. S'ouvre dès qu'une action demande un compte
// (useAccountGate).
export default function AccountScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { userId, profile, canPost, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updateProfile } =
    useAuth();
  const communes = useCommunes();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<EmailMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [communeSlug, setCommuneSlug] = useState("");

  // Rien à faire ici une fois le compte complet.
  useEffect(() => {
    if (canPost) router.back();
  }, [canPost, router]);

  const errorFor = (e: unknown) => {
    const code = e instanceof AuthError ? e.code : "failed";
    if (code === "cancelled") return null;
    if (code === "play_services") return t("App.account.playServices");
    if (code === "pseudo_taken") return t("App.account.pseudoTaken");
    if (code === "pseudo_invalid") return t("App.account.pseudoInvalid");
    if (code === "failed") return t("App.account.signInFailed");
    return t(`App.account.errors.${code}`);
  };

  function switchMode(next: EmailMode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submitEmail() {
    setError(null);
    setInfo(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t("App.account.errors.email_invalid"));
      return;
    }
    if (mode !== "forgot" && password.length < (mode === "signUp" ? MIN_PASSWORD : 1)) {
      setError(t("App.account.passwordHint"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "signIn") {
        await signInWithEmail(email, password);
      } else if (mode === "signUp") {
        const { needsConfirmation } = await signUpWithEmail(email, password);
        if (needsConfirmation) setInfo(t("App.account.checkEmail"));
      } else {
        await sendPasswordReset(email);
        setInfo(t("App.account.resetSent"));
      }
    } catch (e) {
      setError(errorFor(e));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(errorFor(e));
    } finally {
      setBusy(false);
    }
  }

  async function savePseudo() {
    if (!PSEUDO_PATTERN.test(pseudo)) {
      setError(t("App.account.pseudoInvalid"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updateProfile({ pseudo, ...(communeSlug ? { commune_slug: communeSlug } : {}) });
    } catch (e) {
      setError(errorFor(e));
    } finally {
      setBusy(false);
    }
  }

  const needsPseudo = !!userId && !profile?.pseudo;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel={t("App.close")}>
          <X size={24} color={Colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require("@/assets/brand/logo.png")} style={styles.logo} contentFit="contain" />

        {!needsPseudo ? (
          <>
            <Text style={styles.title}>{t("App.account.signInTitle")}</Text>
            <Text style={styles.text}>{t("App.account.signInText")}</Text>
            <Pressable
              onPress={google}
              disabled={busy}
              style={styles.googleButton}
              android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <View style={styles.googleRow}>
                  <Image source={require("@/assets/icons/logo-google.svg")} style={styles.googleLogo} />
                  <Text style={styles.googleText}>{t("App.account.google")}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("App.account.or")}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("App.account.email")}
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              style={styles.input}
            />
            {mode !== "forgot" && (
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={t("App.account.password")}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                style={styles.input}
              />
            )}
            {mode === "signUp" && <Text style={styles.hint}>{t("App.account.passwordHint")}</Text>}

            <Pressable
              onPress={submitEmail}
              disabled={busy}
              style={[styles.primary, busy && styles.disabled]}
              android_ripple={{ color: "rgba(255,255,255,0.25)" }}
              accessibilityRole="button"
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === "signIn"
                    ? t("App.account.signInEmail")
                    : mode === "signUp"
                      ? t("App.account.signUpEmail")
                      : t("App.account.sendReset")}
                </Text>
              )}
            </Pressable>

            {info && <Text style={styles.info}>{info}</Text>}

            <View style={styles.links}>
              {mode === "signIn" ? (
                <>
                  <Pressable onPress={() => switchMode("forgot")} hitSlop={8}>
                    <Text style={styles.link}>{t("App.account.forgot")}</Text>
                  </Pressable>
                  <Pressable onPress={() => switchMode("signUp")} hitSlop={8}>
                    <Text style={styles.link}>{t("App.account.noAccount")}</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => switchMode("signIn")} hitSlop={8}>
                  <Text style={styles.link}>{t("App.account.haveAccount")}</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.small}>{t("App.account.privacy")}</Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t("App.account.pseudoTitle")}</Text>
            <View style={styles.pseudoField}>
              <Text style={styles.at}>@</Text>
              <TextInput
                value={pseudo}
                onChangeText={(text) => setPseudo(text.replace(/[^A-Za-z0-9_]/g, "").slice(0, 20))}
                placeholder={t("App.account.pseudoPlaceholder")}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                style={styles.pseudoInput}
              />
            </View>
            <Text style={styles.small}>{t("App.account.pseudoHint")}</Text>

            <Text style={styles.label}>{t("App.account.commune")}</Text>
            <CommunePicker
              communes={communes.data ?? []}
              value={communeSlug}
              onChange={setCommuneSlug}
              placeholder={t("Konbit.communePlaceholder")}
            />

            <Pressable
              onPress={savePseudo}
              disabled={busy || pseudo.length < 3}
              style={[styles.primary, (busy || pseudo.length < 3) && styles.disabled]}
              android_ripple={{ color: "rgba(255,255,255,0.25)" }}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{t("App.account.save")}</Text>}
            </Pressable>
            <Text style={styles.small}>{t("App.account.privacy")}</Text>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  topBar: { paddingHorizontal: 16, paddingVertical: 10 },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 14 },
  logo: { width: 72, height: 66, alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text, textAlign: "center" },
  text: { fontSize: 15, lineHeight: 22, color: Colors.textLight, textAlign: "center" },
  googleButton: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    overflow: "hidden",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#D1D5DB" },
  dividerText: { fontSize: 13, color: Colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: -6 },
  info: { fontSize: 14, color: "#15803D", textAlign: "center", lineHeight: 20 },
  links: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  link: { fontSize: 14, color: Colors.primary, fontWeight: "600" },
  googleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  googleLogo: { width: 22, height: 22 },
  googleText: { fontSize: 16, fontWeight: "700", color: Colors.text },
  small: { fontSize: 12, color: Colors.textMuted, textAlign: "center" },
  pseudoField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  at: { fontSize: 18, color: Colors.textMuted, fontWeight: "600" },
  pseudoInput: { flex: 1, fontSize: 18, paddingVertical: 12, paddingLeft: 4, color: Colors.text },
  label: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 6 },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    overflow: "hidden",
  },
  disabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  error: { color: Colors.error, textAlign: "center", fontSize: 14 },
});
