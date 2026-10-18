import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";

// Mesure d'utilisation pour le tableau de bord admin : un identifiant tiré au
// hasard pour cette installation (distinct du jeton du Signalement), envoyé au
// plus toutes les 30 min quand l'app est ouverte. Le serveur n'en garde qu'une
// ligne par jour, sans lien avec le compte.
const INSTALL_KEY = "konbit509-install-id";
const MIN_INTERVAL_MS = 30 * 60 * 1000;

let lastPing = 0;

async function installId(): Promise<string> {
  const saved = await AsyncStorage.getItem(INSTALL_KEY).catch(() => null);
  if (saved) return saved;
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALL_KEY, id).catch(() => {});
  return id;
}

async function ping(force = false) {
  if (!force && Date.now() - lastPing < MIN_INTERVAL_MS) return;
  lastPing = Date.now();
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "web" ? "web" : "android";
  await supabase
    .rpc("ping_app", {
      install: await installId(),
      app_platform: platform,
      version: Constants.expoConfig?.version ?? null,
    })
    .then(() => {}, () => {});
}

// userId : on renvoie un signal à la connexion pour compter la personne
// comme connectée ce jour-là.
export function useUsagePing(userId: string | null) {
  useEffect(() => {
    ping(true);
  }, [userId]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") ping();
    });
    return () => sub.remove();
  }, []);
}
