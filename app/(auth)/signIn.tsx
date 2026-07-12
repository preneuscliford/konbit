import React, { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  AppState,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Burnt from "burnt";

import SignInWithGoogleBotton from "@/components/SignInWithGoogleBotton";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

const signIn = () => {
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
    console.log("[signIn] Tentative de connexion:", emailAddress);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailAddress,
      password: password,
    });

    if (error) {
      console.error("[signIn] Erreur:", error.code, error.message);
      if (error.message === "Invalid login credentials") {
        setPasswordError("Email ou mot de passe incorrect.");
        setEmailError("...");
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

    console.log("[signIn] Succès, user:", data.user?.id);

    Burnt.toast({
      title: "Connexion réussie",
      preset: "done",
      message: "Vous êtes maintenant connecté.",
    });

    setEmailAddress("");
    setPassword("");
    setLoading(false);
    router.push("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-ghost-white px-4 sm:px-6 justify-between">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center">
        <View className="mb-6 sm:mb-8">
          <Text className="text-2xl sm:text-3xl font-bold text-gray-900">
            Se connecter
          </Text>
          <Text className="text-sm sm:text-base text-gray-500 mt-2">
            Connectez-vous à votre compte
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm sm:text-base text-gray-700 mb-1">
              Email
            </Text>
            <TextInput
              autoCapitalize="none"
              value={emailAddress}
              placeholder="exemple@email.com"
              onChangeText={setEmailAddress}
              className={`h-11 sm:h-12 text-base border ${
                emailError ? "border-red-500" : "border-gray-200"
              } rounded-lg px-3 sm:px-4`}
              keyboardType="email-address"
            />
            {emailError ? (
              <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
            ) : null}
          </View>

          <View>
            <Text className="text-sm sm:text-base text-gray-700 mb-1">
              Mot de passe
            </Text>
            <TextInput
              value={password}
              placeholder="••••••••"
              secureTextEntry
              onChangeText={setPassword}
              className={`h-11 sm:h-12 text-base border ${
                passwordError ? "border-red-500" : "border-gray-200"
              } rounded-lg px-3 sm:px-4`}
            />
            {passwordError ? (
              <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => router.push("/")}
            className="mt-2 self-end"
          >
            <Text className="text-center text-gray-500 underline">
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={signInWithEmail}
          disabled={loading}
          className="h-11 sm:h-12 bg-blue-500 rounded-lg justify-center items-center mt-6 sm:mt-8"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-medium">Se connecter</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-4 text-gray-400">Ou</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>

        <View>
          <SignInWithGoogleBotton />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/signUp")}
          className="mt-6"
        >
          <Text className="text-center text-gray-600 text-base">
            Pas encore de compte ?{" "}
            <Text className="text-blue-500 font-bold underline">
              S'inscrire
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-auto pb-4 sm:pb-6">
        <Text className="text-xs sm:text-sm text-center text-gray-500">
          En continuant, vous acceptez nos{" "}
          <Text className="text-blue-500 underline">
            Conditions d'utilisation
          </Text>{" "}
          et{" "}
          <Text className="text-blue-500 underline">
            Politique de confidentialité
          </Text>
        </Text>
        <Text className="text-center text-gray-500 text-xs mt-2">
          Version 1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default signIn;
