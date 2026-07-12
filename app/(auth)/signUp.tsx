import React, { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Burnt from "burnt";

import SignInWithGoogleBotton from "@/components/SignInWithGoogleBotton";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";

const signUp = () => {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState("");
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
    setUsernameError("");
    setEmailError("");
    setPasswordError("");

    if (!username.trim()) {
      setUsernameError("Le nom d'utilisateur est requis.");
      isValid = false;
    }
    if (!emailAddress.trim()) {
      setEmailError("L'email est requis.");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) {
      setEmailError("Format de l'email invalide.");
      isValid = false;
    }
    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      isValid = false;
    }
    return isValid;
  };

  const signUpWithEmail = async () => {
    if (!validateFields()) return;

    setLoading(true);
    console.log("[signUp] Tentative inscription:", emailAddress, username);

    // Vérifier si le username existe déjà
    const { data: existingUsers, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error(
        "[signUp] Erreur check username:",
        checkError.code,
        checkError.message,
      );
      Burnt.toast({
        title: "Erreur",
        preset: "error",
        message: "Erreur lors de la vérification du nom d'utilisateur.",
      });
      setLoading(false);
      return;
    }

    if (existingUsers) {
      setUsernameError("Ce nom d'utilisateur est déjà pris.");
      setLoading(false);
      return;
    }

    // Créer le compte avec le username dans user_metadata
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: emailAddress,
        password: password,
        options: {
          data: {
            username: username,
            full_name: username,
          },
        },
      },
    );

    if (signUpError) {
      console.error(
        "[signUp] Erreur signUp:",
        signUpError.code,
        signUpError.message,
      );
      Burnt.toast({
        title: "Échec de l'inscription",
        message: signUpError.message,
        preset: "error",
      });
      setLoading(false);
      return;
    }

    const user = signUpData.user;
    console.log("[signUp] Succès auth, user:", user?.id);

    // S'assurer que le profil a bien le username (le trigger handle_new_user le fait aussi)
    if (user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: username, full_name: username })
        .eq("id", user.id);

      if (updateError) {
        console.error(
          "[signUp] Erreur update profile:",
          updateError.code,
          updateError.message,
        );
      } else {
        console.log("[signUp] Profil mis à jour avec username:", username);
      }
    }

    Burnt.toast({
      title: "Compte créé avec succès !",
      message: "Veuillez vérifier votre email pour confirmer votre compte.",
      preset: "done",
    });

    setUsername("");
    setEmailAddress("");
    setPassword("");
    setLoading(false);
    router.push("/(auth)/signIn");
  };

  return (
    <SafeAreaView className="flex-1 bg-ghost-white px-4 sm:px-6 justify-between">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center">
        <View className="mb-6 sm:mb-8">
          <Text className="text-2xl sm:text-3xl font-bold text-gray-900">
            Créer un compte
          </Text>
          <Text className="text-sm sm:text-base text-gray-500 mt-2">
            Rejoignez notre communauté
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm sm:text-base text-gray-700 mb-1">
              Nom d'utilisateur
            </Text>
            <TextInput
              value={username}
              placeholder="Votre pseudo"
              onChangeText={setUsername}
              className={`h-11 sm:h-12 text-base border ${
                usernameError ? "border-red-500" : "border-gray-200"
              } rounded-lg px-3 sm:px-4`}
              autoCapitalize="none"
            />
            {usernameError ? (
              <Text className="text-red-500 text-sm mt-1">{usernameError}</Text>
            ) : null}
          </View>
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
        </View>

        <TouchableOpacity
          onPress={signUpWithEmail}
          disabled={loading}
          className="h-11 sm:h-12 bg-blue-500 rounded-lg justify-center items-center mt-6 sm:mt-8"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-medium">Créer mon compte</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-gray-200" />
          <Text className="mx-4 text-gray-400">Ou</Text>
          <View className="flex-1 h-px bg-gray-200" />
        </View>
        <SignInWithGoogleBotton />
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signIn")}
          className="mt-6"
        >
          <Text className="text-center text-gray-600 text-base">
            Déjà un compte ?{" "}
            <Text className="text-blue-500 font-bold underline">
              Se connecter
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

export default signUp;
