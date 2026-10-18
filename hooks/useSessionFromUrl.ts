import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

// Les liens des e-mails Supabase arrivent sous la forme
// konbit://<route>#access_token=…&refresh_token=…&type=signup|recovery
// (ou #error_code=… si le lien est expiré). On ouvre la session à partir de ces jetons.
export type UrlSessionStatus = "pending" | "ok" | "invalid";

function parseFragment(url: string) {
  const raw = url.includes("#") ? url.split("#")[1] : url.split("?")[1] ?? "";
  return Object.fromEntries(
    raw
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const [key, value = ""] = pair.split("=");
        return [decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, " "))];
      }),
  ) as Record<string, string>;
}

export function useSessionFromUrl() {
  // useLinkingURL (et non useURL) : quand l'app tournait déjà, le lien arrive
  // avant que cet écran soit monté ; useURL le ratait et restait bloqué.
  const url = Linking.useLinkingURL();
  const [status, setStatus] = useState<UrlSessionStatus>("pending");

  useEffect(() => {
    if (!url) return;
    const params = parseFragment(url);
    if (params.error_code || !params.access_token || !params.refresh_token) {
      setStatus("invalid");
      return;
    }
    supabase.auth
      .setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
      .then(({ error }) => setStatus(error ? "invalid" : "ok"));
  }, [url]);

  return status;
}
