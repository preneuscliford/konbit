import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/app/provider/AuthProvider";

const communityLayout = () => {
  const router = useRouter();
  const { session } = useAuth();

  useEffect(() => {
    if (!session) router.push("/(auth)/signUp");
  }, [session, router]);
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications"
        options={{
          title: "notification(s)",
          headerStyle: { backgroundColor: "#F5F8FD" },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="postDetails" options={{ headerShown: false }} />
    </Stack>
  );
};

export default communityLayout;
