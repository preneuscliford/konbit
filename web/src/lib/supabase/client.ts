import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Client Supabase du navigateur : session de l'utilisateur gardée dans des
// cookies (lisibles plus tard côté serveur si besoin). Clé publique seulement :
// les règles RLS de la base décident de ce que chaque compte peut lire et écrire.
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
