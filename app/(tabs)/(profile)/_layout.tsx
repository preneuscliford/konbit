import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/app/provider/AuthProvider";
import Colors from "@/constants/Colors";

const profileLayout = () => {
  const router = useRouter();
  const { session, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && !session) router.replace("/(auth)/signUp");
  }, [session, initializing, router]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="editProfile"
        options={{
          headerShown: true,
          title: "Modifier le profil",
          headerStyle: { backgroundColor: Colors.surfaceWarm },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: "800",
            color: Colors.text,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: true,
          title: "Paramètres",
          headerStyle: { backgroundColor: Colors.surfaceWarm },
          headerTitleStyle: {
            fontSize: 17,
            fontWeight: "800",
            color: Colors.text,
          },
          headerTintColor: Colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
};

export default profileLayout;

const styles = StyleSheet.create({});
