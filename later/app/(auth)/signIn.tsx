import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock } from "lucide-react-native";
import * as Burnt from "burnt";

import SignInWithGoogleBotton from "@/components/SignInWithGoogleBotton";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";

const SignInScreen = () => {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/(tabs)");
        return true;
      },
    );
    return () => backHandler.remove();
  }, []);

  const validateFields = () => {
    let isValid = true;

    if (!emailAddress) {
      setEmailError("L'adresse email est requise.");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      setEmailError("L'adresse email n'est pas valide.");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Le mot de passe est requis.");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const signInWithEmail = async () => {
    if (!validateFields()) return;

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailAddress,
      password: password,
    });

    if (error) {
      if (error.message === "Invalid login credentials") {
        setPasswordError("Email ou mot de passe incorrect.");
      } else if (error.code === "email_not_confirmed") {
        Burnt.toast({
          title: "Email non confirmé",
          preset: "error",
          message:
            "Vérifiez votre boîte mail ou désactivez la confirmation dans le dashboard Supabase.",
        });
      } else {
        Burnt.toast({
          title: "Erreur: " + (error.code || "inconnue"),
          preset: "error",
          message: error.message,
        });
      }
      setLoading(false);
      return;
    }

    Burnt.toast({
      title: "Connexion réussie",
      preset: "done",
      message: "Vous êtes maintenant connecté.",
    });

    setEmailAddress("");
    setPassword("");
    setLoading(false);
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-warm px-4 sm:px-6 justify-between">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center">
        <AuthBranding
          title="Se connecter"
          subtitle="Connectez-vous à votre compte"
        />

        <View>
          <AuthTextField
            label="Email"
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="exemple@email.com"
            error={emailError}
            icon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

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

          <TouchableOpacity
            onPress={() => router.push("/(auth)/forgotPassword")}
            className="mb-2 self-end"
          >
            <Text className="text-center text-charcoal-muted underline">
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>

        <AuthButton
          title="Se connecter"
          onPress={signInWithEmail}
          loading={loading}
        />

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-surface-muted" />
          <Text className="mx-4 text-charcoal-muted">Ou</Text>
          <View className="flex-1 h-px bg-surface-muted" />
        </View>

        <View>
          <SignInWithGoogleBotton />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signUp")}
          className="mt-6"
        >
          <Text className="text-center text-charcoal text-base">
            Pas encore de compte ?{" "}
            <Text className="text-primary font-bold underline">
              S'inscrire
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-auto pb-4 sm:pb-6">
        <Text className="text-xs sm:text-sm text-center text-charcoal-muted">
          En continuant, vous acceptez nos{" "}
          <Text className="text-primary underline">
            Conditions d'utilisation
          </Text>{" "}
          et{" "}
          <Text className="text-primary underline">
            Politique de confidentialité
          </Text>
        </Text>
        <Text className="text-center text-charcoal-muted text-xs mt-2">
          Version 1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default SignInScreen;
