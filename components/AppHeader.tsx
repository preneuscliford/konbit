import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { UserRound } from "lucide-react-native";
import Colors from "@/constants/Colors";
import LanguageToggle from "@/components/konbit/LanguageToggle";
import Avatar from "@/components/konbit509/Avatar";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

// En-tête commun aux onglets : logo Konbit 509, bouton propre à l'onglet
// (`action`), sélecteur de langue, puis l'avatar de la personne connectée
// (vers son profil) ou une icône de compte (vers la connexion).
export default function AppHeader({ title, action }: { title?: string; action?: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const { userId, profile } = useAuth();
  const signedIn = !!userId && !!profile?.pseudo;

  return (
    <View style={styles.header}>
      <Image source={require("@/assets/brand/logo.png")} style={styles.logo} contentFit="contain" />
      <Text style={styles.title} numberOfLines={1}>
        {title ?? "Konbit 509"}
      </Text>
      {action}
      <LanguageToggle />
      <Pressable
        onPress={() =>
          signedIn ? router.push({ pathname: "/user/[id]", params: { id: userId } }) : router.push("/account")
        }
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={signedIn ? t("App.settings.profile") : t("App.settings.signIn")}
      >
        {signedIn ? (
          <Avatar
            pseudo={profile.pseudo}
            name={profile.display_name}
            avatarPath={profile.avatar_path}
            seed={userId}
            size={32}
          />
        ) : (
          <View style={styles.guest}>
            <UserRound size={18} color={Colors.textMuted} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  logo: { width: 32, height: 30 },
  title: { flex: 1, fontSize: 19, fontWeight: "800", color: Colors.primary },
  guest: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
});
