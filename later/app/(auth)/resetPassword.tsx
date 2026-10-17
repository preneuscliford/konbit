import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Lock } from "lucide-react-native";
import * as Burnt from "burnt";
import { StatusBar } from "expo-status-bar";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/provider/AuthProvider";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthButton from "@/components/auth/AuthButton";

const ResetPasswordScreen = () => {
  const router = useRouter();
  const { isPasswordRecovery, clearPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPasswordRecovery) {
      Burnt.toast({
        title: "Lien expiré",
        preset: "error",
        message: "Veuillez redemander un lien de réinitialisation.",
      });
      router.replace("/(auth)/forgotPassword");
    }
  }, [isPasswordRecovery]);

  const validate = () => {
    let isValid = true;

    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (confirmPassword !== password) {
      setConfirmError("Les mots de passe ne correspondent pas.");
      isValid = false;
    } else {
      setConfirmError("");
    }

    return isValid;
  };

  const handleUpdatePassword = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Burnt.toast({ title: "Erreur", preset: "error", message: error.message });
      return;
    }

    Burnt.toast({ title: "Mot de passe mis à jour", preset: "done" });
    clearPasswordRecovery();
    router.replace("/(tabs)");
  };

  if (!isPasswordRecovery) return null;

  return (
    <SafeAreaView className="flex-1 bg-surface-warm px-4 sm:px-6 justify-center">
      <StatusBar style="dark" />
      <AuthBranding
        title="Nouveau mot de passe"
        subtitle="Choisissez un nouveau mot de passe pour votre compte"
      />

      <View>
        <AuthTextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          error={passwordError}
          icon={Lock}
          secureTextEntry
          editable={!loading}
        />
        <AuthTextField
          label="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="••••••••"
          error={confirmError}
          icon={Lock}
          secureTextEntry
          editable={!loading}
        />
        <AuthButton
          title="Mettre à jour"
          onPress={handleUpdatePassword}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;
