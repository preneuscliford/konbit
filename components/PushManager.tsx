import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { registerForPush } from "@/lib/push";

// Sans rendu : enregistre le téléphone pour les push quand un compte est
// connecté (et quand la langue change), et gère les notifications reçues.
export default function PushManager() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canPost } = useAuth();
  const { language } = useI18n();

  useEffect(() => {
    if (!canPost) return;
    registerForPush(language).catch((e) => {
      // Firebase / credentials absents en développement : l'app continue sans push.
      if (__DEV__) console.warn("Enregistrement push impossible", e);
    });
  }, [canPost, language]);

  useEffect(() => {
    // Toucher une notification : ouvrir le konbit ou le profil concerné.
    const open = (response: Notifications.NotificationResponse | null) => {
      const path = response?.notification.request.content.data?.path;
      if (typeof path === "string" && path.startsWith("/")) router.push(path as never);
    };
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const tapped = Notifications.addNotificationResponseReceivedListener(open);

    // Reçue app ouverte : le badge et la liste se mettent à jour tout de suite.
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });

    return () => {
      tapped.remove();
      received.remove();
    };
  }, [router, queryClient]);

  return null;
}
