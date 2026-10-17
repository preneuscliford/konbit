import { useEffect } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as Burnt from "burnt";
import { supabase } from "@/lib/supabase";

interface RecoveryParams {
  type: string | null;
  access_token: string | null;
  refresh_token: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

function parseParams(raw: string): RecoveryParams {
  const params: Record<string, string> = {};
  raw.split("&").forEach((pair) => {
    const [key, value] = pair.split("=");
    if (!key) return;
    params[decodeURIComponent(key)] = decodeURIComponent((value || "").replace(/\+/g, " "));
  });

  return {
    type: params.type ?? null,
    access_token: params.access_token ?? null,
    refresh_token: params.refresh_token ?? null,
    errorCode: params.error_code ?? null,
    errorDescription: params.error_description ?? null,
  };
}

function extractRecoveryParams(url: string): RecoveryParams | null {
  const raw = url.includes("#") ? url.split("#")[1] : url.split("?")[1];
  if (!raw) return null;
  return parseParams(raw);
}

export function useAuthDeepLink(onRecoverySession?: () => void) {
  useEffect(() => {
    const handleIncomingUrl = async (url: string | null) => {
      if (!url) return;

      const parsed = extractRecoveryParams(url);
      if (!parsed) return;

      const { type, access_token, refresh_token, errorCode, errorDescription } = parsed;

      if (errorCode) {
        Burnt.toast({
          title: "Lien invalide ou expiré",
          preset: "error",
          message: errorDescription || "Veuillez redemander un lien.",
        });
        router.replace("/(auth)/forgotPassword");
        return;
      }

      if (type === "recovery" && access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          Burnt.toast({ title: "Erreur", preset: "error", message: error.message });
          router.replace("/(auth)/forgotPassword");
          return;
        }

        onRecoverySession?.();
        router.replace("/(auth)/resetPassword");
      }
    };

    Linking.getInitialURL().then(handleIncomingUrl);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => subscription.remove();
  }, [onRecoverySession]);
}
