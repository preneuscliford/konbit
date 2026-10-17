import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Mail } from "lucide-react-native";
import * as Burnt from "burnt";
import { StatusBar } from "expo-status-bar";

import { supabase } from "@/lib/supabase";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthButton from "@/components/auth/AuthButton";

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setEmailError("L'adresse email est requise.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("L'adresse email n'est pas valide.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSendResetLink = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    const redirectTo = Linking.createURL("resetPassword");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);

    if (error) {
      Burnt.toast({ title: "Erreur", preset: "error", message: error.message });
      return;
    }

    setSent(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-warm px-4 sm:px-6 justify-center">
      <StatusBar style="dark" />
      <AuthBranding
        title="Mot de passe oublié"
        subtitle="Recevez un lien pour réinitialiser votre mot de passe"
      />

      {sent ? (
        <View className="items-center">
          <Text className="text-base text-charcoal text-center mb-6">
            Si un compte existe avec cette adresse, un email contenant un lien de
            réinitialisation a été envoyé.
          </Text>
          <AuthButton
            title="Renvoyer le lien"
            variant="ghost"
            onPress={handleSendResetLink}
            loading={loading}
          />
        </View>
      ) : (
        <View>
          <AuthTextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="exemple@email.com"
            error={emailError}
            icon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <AuthButton
            title="Envoyer le lien"
            onPress={handleSendResetLink}
            loading={loading}
          />
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/signIn")}
        className="mt-8"
      >
        <Text className="text-center text-charcoal-muted text-base">
          Retour à la{" "}
          <Text className="text-primary font-bold underline">connexion</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
