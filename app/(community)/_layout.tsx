import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/app/provider/AuthProvider";
import Colors from "@/constants/Colors";

const communityLayout = () => {
  const router = useRouter();
  const { session, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && !session) router.replace("/(auth)/signUp");
  }, [session, initializing, router]);
  return (
    <Stack>
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notifications",
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
      <Stack.Screen name="konbitDetails" options={{ headerShown: false }} />
      <Stack.Screen name="konbitChat" options={{ headerShown: false }} />
    </Stack>
  );
};

export default communityLayout;
