import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import "../globals.css";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AnimationScreen from "@/components/AnimationScreen";
import PushManager from "@/components/PushManager";
import { FONT_ASSETS } from "@/components/ui/Text";
import { useAppState } from "@/hooks/useAppState";
import { useOnlineManager } from "@/hooks/useOnlineManager";
import { AuthProvider, useAuth } from "@/lib/auth";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { LocalStateProvider, useLocalState } from "@/lib/localState";

// Les fonctions mises de côté (ancien code Supabase, messages…) sont dans later/.

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    // gcTime long : le cache est gardé sur le téléphone (voir persister) pour
    // afficher le dernier fil connu même sans réseau.
    queries: { retry: 2, refetchOnReconnect: true, gcTime: 24 * 3600e3 },
    // Pas de retry automatique sur les écritures : un refus (429…) ne doit pas boucler.
    mutations: { retry: 0 },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "konbit509-query-cache" });

export default function RootLayout() {
  useOnlineManager();
  useAppState();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 3600e3, buster: "v3" }}
    >
      <I18nProvider>
        <LocalStateProvider>
          <AuthProvider>
            <AppGate />
          </AuthProvider>
        </LocalStateProvider>
      </I18nProvider>
    </PersistQueryClientProvider>
  );
}

// L'intro Lottie joue pendant le chargement (polices, langue, jeton, session).
function AppGate() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  const i18n = useI18n();
  const local = useLocalState();
  const auth = useAuth();
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!animationFinished || !fontsLoaded || !i18n.ready || !local.ready || !auth.ready) {
    return <AnimationScreen onAnimationFinish={() => setAnimationFinished(true)} />;
  }

  return (
    <>
      {/* Push : enregistrement du téléphone et ouverture des notifications touchées. */}
      <PushManager />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="compose" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="account" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="report-incident" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="konbit/[id]" />
        <Stack.Screen name="user/[id]/index" />
        <Stack.Screen name="user/[id]/follows" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="profile-edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="delete-account" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="rates" />
        <Stack.Screen name="weather" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}
