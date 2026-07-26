import { Text, TouchableOpacity } from "react-native";
import { useEffect } from "react";

import { Image } from "expo-image";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Burnt from "burnt";
import { supabase } from "@/lib/supabase";

const SignInWithGoogleBotton = () => {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    });
  }, []);

  const handleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo?.data?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });
        if (error) {
          Burnt.toast({
            title: "Connexion Google impossible",
            preset: "error",
            message: error.message,
          });
        }
      } else {
        throw new Error("no ID token present!");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Burnt.toast({
          title: "Google Play Services indisponible",
          preset: "error",
          message: "Mettez à jour Google Play Services et réessayez.",
        });
      } else {
        Burnt.toast({
          title: "Connexion Google impossible",
          preset: "error",
          message: error.message || "Une erreur est survenue.",
        });
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handleSignIn}
      className="h-12 border border-surface-muted rounded-lg flex-row items-center justify-center space-x-2"
    >
      <Image
        source={require("../assets/icons/logo-google.svg")}
        style={{
          width: 25,
          height: 25,
          objectFit: "contain",
        }}
      />
      <Text className="text-charcoal font-medium"> Continuer avec Google</Text>
    </TouchableOpacity>
  );
};

export default SignInWithGoogleBotton;
