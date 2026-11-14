"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import TimeAgo from "@/components/feed/TimeAgo";
import { KonbitSkeleton } from "@/components/Skeleton";
import { toast } from "@/components/Toaster";
import {
  deleteNotification,
  fetchNotifications,
  markAllRead,
  moderationText,
  NOTIFICATION_TEXT,
  type AppNotification,
} from "@/lib/notifications";
import { displayName, formatDate } from "@/lib/site";
import { setUnreadCount } from "./useUnreadCount";

const excerpt = (text: string, max = 120) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

// Notifications du compte : J'aime, réponses, participants, abonnés, nouveaux
// konbits des personnes suivies, décisions de l'équipe et annonces.
export default function NotificationsList() {
  const router = useRouter();
  const { ready, userId } = useAuth();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  // Non lues à l'ouverture (mises en valeur), puis tout passe en lu.
  const [unread, setUnread] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      router.replace("/konekte?next=%2Fnotifikasyon");
      return;
    }
    let cancelled = false;
    fetchNotifications()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setUnread(new Set(list.filter((n) => !n.read_at).map((n) => n.id)));
        void markAllRead().then(() => setUnreadCount(0));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [ready, userId, router]);

  async function remove(id: number) {
    setItems((list) => list?.filter((n) => n.id !== id) ?? null);
    try {
      await deleteNotification(id);
    } catch {
      toast("Nou pa ka efase l kounye a.", "error");
    }
  }

  if (failed)
    return (
      <p className="px-6 py-16 text-center text-stone-500">
        Nou pa ka chaje notifikasyon yo. Eseye ankò.
      </p>
    );
  if (!items) {
    return (
      <>
        <KonbitSkeleton />
        <KonbitSkeleton />
      </>
    );
  }
  if (items.length === 0) {
    return (
      <p className="mx-auto max-w-sm px-6 py-16 text-center text-stone-500">
        Ou poko gen notifikasyon. Swiv moun epi patisipe nan konbit pou w
        resevwa nouvèl.
      </p>
    );
  }

  return (
    <ul>
      {items.map((n) => (
        <li
          key={n.id}
          className={`group relative flex gap-3 border-b border-stone-200 px-4 py-3.5 ${unread.has(n.id) ? "bg-blue-50/60" : ""}`}
        >
          <NotificationRow n={n} />
          <button
            type="button"
            onClick={() => void remove(n.id)}
            aria-label="Efase notifikasyon an"
            title="Efase"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 sm:hidden sm:group-hover:flex sm:group-focus-within:flex"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  // Décision de l'équipe ou annonce : pas d'auteur, logo de Konbit 509.
  if (n.type === "moderation" || n.type === "announcement") {
    const text =
      n.type === "moderation" && n.moderation
        ? moderationText(
            n.moderation,
            n.moderation.until ? formatDate(n.moderation.until) : "",
          )
        : (n.announcement?.title ?? "");
    return (
      <>
        <Image
          src="/logo.png"
          alt=""
          width={40}
          height={38}
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[15px] text-stone-900">
            <b>Ekip Konbit 509</b>
            <span className="text-stone-500">
              {" · "}
              <TimeAgo iso={n.created_at} />
            </span>
          </p>
          <p className="mt-0.5 text-[15px] leading-snug text-stone-800">
            {text}
          </p>
          {n.type === "announcement" && n.announcement?.body && (
            <p className="mt-1 whitespace-pre-line text-sm text-stone-600">
              {n.announcement.body}
            </p>
          )}
          {n.type === "moderation" && n.moderation?.note && (
            <p className="mt-1 text-sm text-stone-600">{n.moderation.note}</p>
          )}
          {n.type === "moderation" &&
            n.moderation?.action !== "lift" &&
            n.moderation?.action !== "restore_content" && (
              <p className="mt-1 text-xs text-stone-500">
                Ou panse se yon erè? Ekri{" "}
                <a
                  href="mailto:konbit@haitiscope.com"
                  className="text-brand underline"
                >
                  konbit@haitiscope.com
                </a>
                .
              </p>
            )}
        </div>
      </>
    );
  }

  const actor = n.actor;
  const name = displayName(actor?.display_name ?? null, actor?.pseudo ?? null);
  const href =
    n.type === "new_follower" && actor?.pseudo
      ? `/u/${actor.pseudo}`
      : n.konbit_id
        ? `/k/${n.konbit_id}${n.type === "new_reply" ? "#repons" : ""}`
        : "#";
  const quote =
    n.type === "new_reply"
      ? n.reply?.body
      : (n.konbit?.title ?? n.konbit?.body);

  return (
    <Link href={href} className="flex min-w-0 flex-1 gap-3 pr-6">
      <Avatar
        name={name}
        avatarPath={actor?.avatar_path ?? null}
        seed={actor?.id ?? String(n.id)}
        size={40}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug text-stone-900">
          <b>{name}</b> {NOTIFICATION_TEXT[n.type]}
          <span className="text-stone-500">
            {" · "}
            <TimeAgo iso={n.created_at} />
          </span>
        </span>
        {quote && (
          <span className="mt-0.5 block text-sm text-stone-500">
            « {excerpt(quote)} »
          </span>
        )}
      </span>
    </Link>
  );
}
