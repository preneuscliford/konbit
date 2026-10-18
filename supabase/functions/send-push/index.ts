// Envoie la notification push correspondant à une ligne de public.notifications.
// Appelée par le trigger notifications_push (pg_net), sans JWT utilisateur.
//
// Pourquoi verify_jwt = false sans risque : l'appelant ne fournit que
// l'identifiant de la notification. Tout le contenu (destinataire, texte,
// lien) est relu en base avec la clé service, et la notification est
// "réservée" (pushed_at) avant l'envoi : un appel répété ou malveillant ne
// peut ni inventer un message, ni renvoyer deux fois le même.
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type Lang = "ht" | "fr";

const TEXTS: Record<Lang, { newKonbit: string; newFollower: (name: string) => string }> = {
  ht: { newKonbit: "Lanse yon nouvo konbit", newFollower: (name) => `${name} kòmanse swiv ou` },
  fr: { newKonbit: "A lancé un nouveau konbit", newFollower: (name) => `${name} a commencé à te suivre` },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const { notification_id: notificationId } = await req.json().catch(() => ({}));
  if (!Number.isInteger(notificationId) || notificationId <= 0) return json(400, { error: "invalid_id" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Réservation atomique : seule la première exécution obtient la ligne.
  const { data: notification, error } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("pushed_at", null)
    .select(
      "id, type, recipient_id, actor_id, konbit_id, actor:profiles!notifications_actor_id_fkey(pseudo, display_name), konbit:konbits(body)",
    )
    .maybeSingle();
  if (error) return json(500, { error: "db_error" });
  if (!notification) return json(200, { skipped: true });

  const { data: tokens } = await admin
    .from("push_tokens")
    .select("token, language")
    .eq("user_id", notification.recipient_id);
  if (!tokens?.length) return json(200, { sent: 0 });

  const actor = notification.actor as { pseudo: string | null; display_name: string | null } | null;
  const actorName = actor?.display_name || actor?.pseudo || "Konbit 509";
  const konbit = notification.konbit as { body: string } | null;
  const snippet = konbit?.body ? (konbit.body.length > 120 ? `${konbit.body.slice(0, 117)}…` : konbit.body) : "";
  const path =
    notification.type === "new_konbit" && notification.konbit_id
      ? `/konbit/${notification.konbit_id}`
      : `/user/${notification.actor_id}`;

  const messages = tokens.map(({ token, language }) => {
    const t = TEXTS[(language as Lang) in TEXTS ? (language as Lang) : "ht"];
    const isKonbit = notification.type === "new_konbit";
    return {
      to: token,
      title: isKonbit ? actorName : "Konbit 509",
      body: isKonbit ? (snippet ? `${t.newKonbit} : ${snippet}` : t.newKonbit) : t.newFollower(actorName),
      data: { path },
      sound: "default",
      channelId: "default",
      priority: "high",
    };
  });

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  const result = await response.json().catch(() => null);

  // Téléphones désinstallés ou jetons expirés : on les oublie.
  const tickets: { status: string; details?: { error?: string } }[] = result?.data ?? [];
  const dead = tickets
    .map((ticket, i) => (ticket.details?.error === "DeviceNotRegistered" ? messages[i].to : null))
    .filter((token): token is string => !!token);
  if (dead.length) await admin.from("push_tokens").delete().in("token", dead);

  return json(200, { sent: messages.length, removed: dead.length });
});
