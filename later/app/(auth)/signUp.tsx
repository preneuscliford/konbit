import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock, User } from "lucide-react-native";
import * as Burnt from "burnt";

import SignInWithGoogleBotton from "@/components/SignInWithGoogleBotton";
import AuthBranding from "@/components/auth/AuthBranding";
import AuthTextField from "@/components/auth/AuthTextField";
import AuthButton from "@/components/auth/AuthButton";
import { supabase } from "@/lib/supabase";
import { StatusBar } from "expo-status-bar";

const SignUpScreen = () => {
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

    // Vérifier si le username existe déjà (feedback rapide côté UX)
    const { data: existingUsers, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
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
      // Filet de sécurité en cas de course entre le check ci-dessus et le
      // signUp réel (contrainte UNIQUE en base sur profiles.username).
      const message = signUpError.message?.toLowerCase() || "";
      if (message.includes("duplicate") || message.includes("username")) {
        setUsernameError(
          "Ce nom d'utilisateur vient d'être pris, veuillez en choisir un autre.",
        );
      } else {
        Burnt.toast({
          title: "Échec de l'inscription",
          message: signUpError.message,
          preset: "error",
        });
      }
      setLoading(false);
      return;
    }

    const user = signUpData.user;

    // S'assurer que le profil a bien le username (le trigger handle_new_user le fait aussi)
    if (user) {
      await supabase
        .from("profiles")
        .update({ username: username, full_name: username })
        .eq("id", user.id);
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
    router.replace("/(auth)/signIn");
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-warm px-4 sm:px-6 justify-between">
      <StatusBar style="dark" />
      <View className="flex-1 justify-center">
        <AuthBranding
          title="Créer un compte"
          subtitle="Rejoignez notre communauté"
        />

        <View>
          <AuthTextField
            label="Nom d'utilisateur"
            value={username}
            onChangeText={setUsername}
            placeholder="Votre pseudo"
            error={usernameError}
            icon={User}
            autoCapitalize="none"
            editable={!loading}
          />
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
        </View>

        <AuthButton
          title="Créer mon compte"
          onPress={signUpWithEmail}
          loading={loading}
        />

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-surface-muted" />
          <Text className="mx-4 text-charcoal-muted">Ou</Text>
          <View className="flex-1 h-px bg-surface-muted" />
        </View>
        <SignInWithGoogleBotton />
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signIn")}
          className="mt-6"
        >
          <Text className="text-center text-charcoal text-base">
            Déjà un compte ?{" "}
            <Text className="text-primary font-bold underline">
              Se connecter
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

export default SignUpScreen;
