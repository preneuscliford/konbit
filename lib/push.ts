import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Notifications push : jeton Expo (via Firebase sur Android) enregistré pour
// le compte connecté, avec la langue de l'app. L'envoi se fait côté serveur
// (fonction Edge send-push), jamais depuis l'app.

const TOKEN_KEY = "konbit-push-token";

// Notification reçue app ouverte : on l'affiche quand même (bannière + son).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(language: "ht" | "fr"): Promise<void> {
  // Les émulateurs ne reçoivent pas de push.
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Konbit 509",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#D21034",
    });
  }

  // Android 13+ : autorisation demandée une fois ; un refus est respecté.
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const { error } = await supabase.rpc("register_push_token", { push_token: token, push_language: language });
  if (!error) await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
}

// À la déconnexion : ce téléphone ne reçoit plus les notifications de ce compte.
export async function unregisterPush(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await supabase.rpc("unregister_push_token", { push_token: token });
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}
