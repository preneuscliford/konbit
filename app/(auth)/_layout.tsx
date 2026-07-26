import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import { router, Stack, useNavigation } from "expo-router";
import { useAuth } from "../provider/AuthProvider";

const AuthLayout = () => {
  const { session, isPasswordRecovery } = useAuth();
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    if (session && !isPasswordRecovery) router.replace("/");
  }, [session, isPasswordRecovery, navigation]);
  return (
    <Stack>
      <Stack.Screen name="signIn" options={{ headerShown: false }} />
      <Stack.Screen name="signUp" options={{ headerShown: false }} />
      <Stack.Screen name="forgotPassword" options={{ headerShown: false }} />
      <Stack.Screen name="resetPassword" options={{ headerShown: false }} />
    </Stack>
  );
};

export default AuthLayout;

const styles = StyleSheet.create({});
