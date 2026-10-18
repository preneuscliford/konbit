import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization manquante" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Client "appelant" : valide le JWT transmis par l'app et identifie l'utilisateur
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non authentifié" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Reconfirmation exigée : mot de passe (compte e-mail) ou nouveau jeton
    // Google du même compte Google. Vérifiée ici, pas seulement dans l'app.
    const { password, googleIdToken } = await req.json().catch(() => ({}));
    let confirmed = false;
    if (typeof password === "string" && password && user.email) {
      const verifier = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data, error } = await verifier.auth.signInWithPassword({ email: user.email, password });
      confirmed = !error && data.user?.id === user.id;
    } else if (typeof googleIdToken === "string" && googleIdToken) {
      // Google valide la signature et l'expiration du jeton ; on vérifie qu'il
      // vient du compte Google lié à cet utilisateur et qu'il est récent.
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(googleIdToken)}`,
      );
      if (res.ok) {
        const info = await res.json();
        const identity = user.identities?.find((i) => i.provider === "google");
        const googleSub = identity?.identity_data?.sub ?? identity?.id;
        const issuedAt = Number(info.iat) * 1000;
        confirmed = !!googleSub && info.sub === googleSub && Date.now() - issuedAt < 10 * 60 * 1000;
      }
    }
    if (!confirmed) {
      return new Response(JSON.stringify({ error: "reauth_failed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client admin (service_role) : seule cette clé peut supprimer un utilisateur
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Photos de l'utilisateur (profil, couverture, konbits), rangées dans un
    // dossier à son id. Effacées avant le compte : si ça échoue, l'utilisateur
    // peut réessayer, le compte existant toujours.
    for (const bucket of ["avatars", "konbit-media"]) {
      while (true) {
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from(bucket)
          .list(user.id, { limit: 1000 });
        if (listError) throw listError;
        if (!files || files.length === 0) break;
        const { error: removeError } = await supabaseAdmin.storage
          .from(bucket)
          .remove(files.map((file) => `${user.id}/${file.name}`));
        if (removeError) throw removeError;
        if (files.length < 1000) break;
      }
    }

    // Profil, konbits, réponses, participations, J'aime, abonnements,
    // notifications et jetons push suivent par cascade.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
