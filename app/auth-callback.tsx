import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Burnt from "burnt";
import Colors from "@/constants/Colors";
import { useSessionFromUrl } from "@/hooks/useSessionFromUrl";
import { useI18n } from "@/lib/i18n";

// Arrivée depuis le lien de confirmation d'inscription envoyé par e-mail.
// Une fois connecté, l'écran de compte demande le pseudo s'il manque.
export default function AuthCallbackScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const status = useSessionFromUrl();

  useEffect(() => {
    if (status === "ok") {
      Burnt.toast({ title: t("App.account.emailConfirmed"), preset: "done" });
      router.replace("/account");
    } else if (status === "invalid") {
      Burnt.toast({ title: t("App.account.linkInvalid"), preset: "error" });
      router.replace("/account");
    }
  }, [status, router, t]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surface },
});
