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
type ModerationAction = "warn" | "restrict" | "suspend" | "lift" | "remove_content" | "restore_content";

const REASONS: Record<Lang, Record<string, string>> = {
  ht: {
    spam: "Spam oswa piblisite",
    harassment: "Arasman",
    hate: "Diskou rayisman",
    violence: "Vyolans oswa menas",
    false_info: "Fo enfòmasyon",
    other: "Lòt rezon",
  },
  fr: {
    spam: "Spam ou publicité",
    harassment: "Harcèlement",
    hate: "Discours de haine",
    violence: "Violence ou menace",
    false_info: "Fausse information",
    other: "Autre raison",
  },
};

const TEXTS: Record<
  Lang,
  {
    newKonbit: string;
    newFollower: (name: string) => string;
    newLike: string;
    newReply: string;
    newParticipant: string;
    moderation: (action: ModerationAction, reason: string, until: string) => string;
  }
> = {
  ht: {
    newKonbit: "Lanse yon nouvo konbit",
    newFollower: (name) => `${name} kòmanse swiv ou`,
    newLike: "Renmen konbit ou a",
    newReply: "Reponn konbit ou a",
    newParticipant: "Di « Mwen ladan » pou konbit ou a",
    moderation: (action, reason, until) =>
      ({
        warn: `Ou resevwa yon avètisman${reason ? ` : ${reason}` : ""}.`,
        restrict: `Kont ou limite jiska ${until}${reason ? ` (${reason})` : ""}.`,
        suspend: `Kont ou sispann${reason ? ` (${reason})` : ""}.`,
        lift: "Restriksyon sou kont ou leve.",
        remove_content: `Youn nan piblikasyon ou yo retire${reason ? ` (${reason})` : ""}.`,
        restore_content: "Piblikasyon ou an retabli.",
      })[action],
  },
  fr: {
    newKonbit: "A lancé un nouveau konbit",
    newFollower: (name) => `${name} a commencé à te suivre`,
    newLike: "A aimé ton konbit",
    newReply: "A répondu à ton konbit",
    newParticipant: "A dit « Mwen ladan » pour ton konbit",
    moderation: (action, reason, until) =>
      ({
        warn: `Tu as reçu un avertissement${reason ? ` : ${reason}` : ""}.`,
        restrict: `Ton compte est limité jusqu'au ${until}${reason ? ` (${reason})` : ""}.`,
        suspend: `Ton compte est suspendu${reason ? ` (${reason})` : ""}.`,
        lift: "La restriction de ton compte est levée.",
        remove_content: `Une de tes publications a été retirée${reason ? ` (${reason})` : ""}.`,
        restore_content: "Ta publication a été rétablie.",
      })[action],
  },
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 3)}…` : text);

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
      `id, type, recipient_id, actor_id, konbit_id, announcement_id,
       actor:profiles!notifications_actor_id_fkey(pseudo, display_name),
       konbit:konbits(body),
       reply:konbit_replies(body),
       moderation:moderation_actions(action, reason, until),
       announcement:announcements(title, body)`,
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
  const reply = notification.reply as { body: string } | null;
  const moderation = notification.moderation as
    | { action: ModerationAction; reason: string | null; until: string | null }
    | null;
  const announcement = notification.announcement as { title: string; body: string } | null;

  const path =
    ["new_konbit", "new_like", "new_reply", "new_participant"].includes(notification.type) && notification.konbit_id
      ? `/konbit/${notification.konbit_id}`
      : notification.type === "new_follower"
        ? `/user/${notification.actor_id}`
        : notification.type === "announcement" && notification.announcement_id
          ? `/announcement/${notification.announcement_id}`
          : "/notifications";

  const messages = tokens.map(({ token, language }) => {
    const lang: Lang = language === "fr" ? "fr" : "ht";
    const t = TEXTS[lang];
    let title = "Konbit 509";
    let body: string;
    switch (notification.type) {
      case "new_konbit": {
        title = actorName;
        const snippet = konbit?.body ? shorten(konbit.body, 120) : "";
        body = snippet ? `${t.newKonbit} : ${snippet}` : t.newKonbit;
        break;
      }
      case "new_like":
      case "new_participant": {
        title = actorName;
        const label = notification.type === "new_like" ? t.newLike : t.newParticipant;
        body = konbit?.body ? `${label} : ${shorten(konbit.body, 100)}` : label;
        break;
      }
      case "new_reply":
        title = actorName;
        body = reply?.body ? `${t.newReply} : ${shorten(reply.body, 120)}` : t.newReply;
        break;
      case "moderation": {
        const reason = moderation?.reason ? REASONS[lang][moderation.reason] ?? "" : "";
        const until = moderation?.until
          ? new Date(moderation.until).toLocaleDateString(lang === "fr" ? "fr-FR" : "fr-HT", {
              day: "numeric",
              month: "long",
              timeZone: "America/Port-au-Prince",
            })
          : "";
        body = t.moderation(moderation?.action ?? "warn", reason, until);
        break;
      }
      case "announcement":
        title = announcement?.title ?? title;
        body = shorten(announcement?.body ?? "", 180);
        break;
      default:
        body = t.newFollower(actorName);
    }
    return { to: token, title, body, data: { path }, sound: "default", channelId: "default", priority: "high" };
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
