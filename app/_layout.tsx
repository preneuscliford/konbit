import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../globals.css";
import { useColorScheme } from "@/hooks/useColorScheme";
import AuthProvider from "./provider/AuthProvider";
import AnimationScreen from "@/components/AnimationScreen";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { Platform, AppStateStatus } from "react-native";
import { useOnlineManager } from "@/hooks/useOnlineManager";
import { useAppState } from "@/hooks/useAppState";
import OfflineNotice from "@/components/OfflineNotice";

SplashScreen.preventAutoHideAsync();

// Créer le queryClient en dehors du composant pour éviter les re-créations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: "online",
    },
    mutations: {
      networkMode: "online",
      retry: 3,
    },
  },
});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Utiliser les hooks personnalisés pour la gestion de la connectivité
  useOnlineManager();
  useAppState();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setAppIsReady(true);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!appIsReady || !animationFinished) {
    return (
      <AnimationScreen
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) {
            setAnimationFinished(true);
          }
        }}
      />
    );
  }

  // Envelopper toute l'application avec QueryClientProvider
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineNotice />
        <Stack screenOptions={{ headerShadowVisible: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
