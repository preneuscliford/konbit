"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  HandshakeIcon,
  HeartIcon,
  MoreIcon,
  ReplyIcon,
  RepostIcon,
  ShareIcon,
} from "@/components/Icons";
import Lightbox from "@/components/media/Lightbox";
import { toast } from "@/components/Toaster";
import type { Konbit } from "@/lib/data";
import { isPlainRepost, originalAsKonbit } from "@/lib/repost";
import {
  ABUSE_REASONS,
  deleteKonbit,
  konbitErrorMessage,
  reportAbuse,
  setLike,
  repost,
  setParticipation,
  undoRepost,
  type AbuseReason,
} from "@/lib/konbit-actions";
import { displayName, KIND_LABEL } from "@/lib/site";
import { mediaUrl } from "@/lib/storage";
import { formatKonbitDate } from "@/lib/konbit-time";
import KonbitSummary, { useKonbitStatus } from "./KonbitSummary";
import BusinessFeedCard, { QuotedBusiness } from "./BusinessFeedCard";
import QuotedKonbit from "./QuotedKonbit";
import RepostMenu from "./RepostMenu";
import TimeAgo from "./TimeAgo";
import { useRequireAccount } from "./useRequireAccount";

// Konbit dans le fil, composition inspirée de X : avatar à gauche ; à droite
// le nom, la commune et l'heure, le texte, les images, puis les actions.
// `full` : page du konbit (texte plus grand, pas de lien vers lui-même).
type PostProps = {
  konbit: Konbit;
  communeName: string;
  full?: boolean;
  onDeleted?: (id: number) => void;
  // Page du konbit : l'espace de messages s'ouvre dès qu'on rejoint.
  onJoinChange?: (joined: boolean) => void;
};

export default function KonbitPost(props: PostProps) {
  if (!isPlainRepost(props.konbit)) return <KonbitPostBody {...props} />;
  return <PlainRepost konbit={props.konbit} communeName={props.communeName} />;
}

// Repost simple : « 🔁 X reposte », puis la publication d'origine (actions
// sur l'original), ou un message si elle n'est plus disponible.
function PlainRepost({
  konbit,
  communeName,
}: {
  konbit: Konbit;
  communeName: string;
}) {
  const { userId } = useAuth();
  const mine = !!userId && konbit.author_id === userId;
  const name = mine
    ? "Ou"
    : displayName(konbit.author_name, konbit.author_pseudo);
  return (
    <div className="border-b border-stone-200">
      <p className="flex items-center gap-2 px-4 pt-2.5 pl-[3.25rem] text-[13px] font-bold text-stone-500">
        <RepostIcon className="h-4 w-4" />
        {konbit.author_pseudo && !mine ? (
          <Link href={`/u/${konbit.author_pseudo}`} className="hover:underline">
            {name} reposte
          </Link>
        ) : (
          <span>{name} reposte</span>
        )}
      </p>
      {konbit.business_id ? (
        <BusinessFeedCard business={konbit.business ?? null} />
      ) : konbit.original ? (
        <KonbitPostBody
          konbit={originalAsKonbit(konbit.original, mine)}
          communeName={communeName}
          noBorder
        />
      ) : (
        <div className="px-4 pb-3">
          <QuotedKonbit original={null} />
        </div>
      )}
    </div>
  );
}

function KonbitPostBody({
  konbit: initial,
  communeName,
  full = false,
  onDeleted,
  onJoinChange,
  noBorder = false,
}: PostProps & { noBorder?: boolean }) {
  const router = useRouter();
  const { userId } = useAuth();
  const requireAccount = useRequireAccount();
  const [k, setK] = useState(initial);
  const [menu, setMenu] = useState<"closed" | "menu" | "report">("closed");
  const [menuUp, setMenuUp] = useState(false);
  const busy = useRef({ like: false, join: false });
  const [confirm, setConfirm] = useState<"join" | "leave" | null>(null);
  // Photo ouverte en plein écran (index), ou aucune.
  const [viewer, setViewer] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [repostMenu, setRepostMenu] = useState(false);

  // Nouvelle donnée du parent (état personnel chargé après coup, etc.).
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setK(initial);
  }

  const name = displayName(k.author_name, k.author_pseudo);
  const images = k.media.filter((m) => m.type === "image").slice(0, 2);
  const href = `/k/${k.id}`;
  const isMine = !!userId && k.author_id === userId;
  // Konbit = action collective ; « Mwen ladan » existe aussi sur les anciennes
  // idées et anciens projets, jamais sur un simple message.
  const isKonbit = k.kind === "konbit";
  const canJoin = k.kind !== "discussion";
  const status = useKonbitStatus(k);
  const members = k.participant_count + 1;
  const isFull = !!k.max_participants && members >= k.max_participants;
  const ended = status === "ended";

  function toggleLike() {
    requireAccount(async (me) => {
      if (busy.current.like) return;
      busy.current.like = true;
      const on = !k.liked;
      setK((c) => ({
        ...c,
        liked: on,
        like_count: Math.max(0, c.like_count + (on ? 1 : -1)),
      }));
      try {
        await setLike(k.id, me, on);
      } catch (e) {
        setK((c) => ({
          ...c,
          liked: !on,
          like_count: Math.max(0, c.like_count + (on ? -1 : 1)),
        }));
        toast(konbitErrorMessage(e), "error");
      } finally {
        busy.current.like = false;
      }
    });
  }

  // Demande de confirmation avant de rejoindre ou de quitter (évite les
  // clics par erreur).
  function askJoin() {
    requireAccount(() => setConfirm(k.joined ? "leave" : "join"));
  }

  async function join(on: boolean) {
    if (!userId || busy.current.join) return;
    busy.current.join = true;
    setJoining(true);
    try {
      await setParticipation(k.id, userId, on);
      setK((c) => ({
        ...c,
        joined: on,
        participant_count: Math.max(0, c.participant_count + (on ? 1 : -1)),
      }));
      toast(on ? "Ou nan konbit la! 🙌" : "Ou soti nan konbit la.");
      onJoinChange?.(on);
      setConfirm(null);
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
      setConfirm(null);
    } finally {
      busy.current.join = false;
      setJoining(false);
    }
  }

  async function toggleRepost() {
    setRepostMenu(false);
    if (!userId) return;
    const on = !k.reposted;
    setK((c) => ({
      ...c,
      reposted: on,
      repost_count: Math.max(0, (c.repost_count ?? 0) + (on ? 1 : -1)),
    }));
    try {
      if (on) await repost(k);
      else await undoRepost(k.id, userId);
      toast(on ? "Ou reposte l." : "Repost la anile.");
      router.refresh();
    } catch (e) {
      setK((c) => ({
        ...c,
        reposted: !on,
        repost_count: Math.max(0, (c.repost_count ?? 0) + (on ? -1 : 1)),
      }));
      toast(konbitErrorMessage(e), "error");
    }
  }

  async function share() {
    const url = `${window.location.origin}${href}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Konbit pa ${name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé : rien à signaler.
    }
  }

  async function remove() {
    setMenu("closed");
    if (!window.confirm("Efase konbit sa a? Ou p ap ka jwenn li ankò.")) return;
    try {
      await deleteKonbit(k.id, k.media);
      toast("Konbit la efase.");
      if (onDeleted) onDeleted(k.id);
      else router.push("/konbit");
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
    }
  }

  async function report(reason: AbuseReason) {
    setMenu("closed");
    try {
      await reportAbuse("konbit", k.id, reason);
      toast("Mèsi. N ap gade sa.");
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
    }
  }

  // Clic n'importe où sur la carte : ouvre le konbit (sauf liens et boutons).
  function openFromCard(e: React.MouseEvent) {
    if (full) return;
    if ((e.target as HTMLElement).closest("a, button, [role=menu]")) return;
    if (window.getSelection()?.toString()) return;
    router.push(href);
  }

  const authorHref = k.author_pseudo ? `/u/${k.author_pseudo}` : null;
  const action =
    "group flex items-center gap-1.5 rounded-full text-[13px] text-stone-500 transition";

  return (
    <article
      onClick={openFromCard}
      className={`relative flex gap-3 ${noBorder ? "" : "border-b border-stone-200"} px-4 py-3 ${full ? "" : "cursor-pointer hover:bg-stone-50/70"}`}
    >
      <div className="shrink-0 pt-0.5">
        {authorHref ? (
          <Link href={authorHref}>
            <Avatar
              name={name}
              avatarPath={k.author_avatar}
              seed={k.author_id}
              size={42}
            />
          </Link>
        ) : (
          <Avatar
            name={name}
            avatarPath={k.author_avatar}
            seed={k.author_id}
            size={42}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-[15px] leading-5">
            {authorHref ? (
              <Link
                href={authorHref}
                className="font-bold text-stone-900 hover:underline"
              >
                {name}
              </Link>
            ) : (
              <span className="font-bold text-stone-900">{name}</span>
            )}
            {k.author_pseudo && (
              <span className="text-stone-500"> @{k.author_pseudo}</span>
            )}
            <span className="text-stone-500">
              {" · "}
              <Link href={href} className="hover:underline">
                <TimeAgo iso={k.created_at} />
              </Link>
            </span>
          </p>
          <div className="relative -mr-2 -mt-1">
            <button
              type="button"
              onClick={(e) => {
                // Pas assez de place en dessous (liste des raisons ≈ 400 px) :
                // le menu s'ouvre vers le haut pour ne pas sortir de l'écran.
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuUp(
                  window.innerHeight - rect.bottom < 420 && rect.top > 420,
                );
                setMenu((m) => (m === "closed" ? "menu" : "closed"));
              }}
              aria-label="Plis aksyon"
              aria-haspopup="menu"
              aria-expanded={menu !== "closed"}
              className="rounded-full p-1.5 text-stone-400 hover:bg-blue-50 hover:text-brand"
            >
              <MoreIcon className="h-[18px] w-[18px]" />
            </button>
            {menu !== "closed" && (
              <PostMenu
                mode={menu}
                up={menuUp}
                isMine={isMine}
                onClose={() => setMenu("closed")}
                onDelete={remove}
                onAskReport={() => requireAccount(() => setMenu("report"))}
                onReport={report}
              />
            )}
          </div>
        </div>

        {isKonbit ? (
          <KonbitSummary
            konbit={k}
            communeName={communeName}
            status={status}
            full={full}
          />
        ) : (
          <>
            <p className="text-[13px] text-stone-500">
              {/* Message pour tout le pays : pas de commune affichée. */}
              {k.commune_slug !== "national" && communeName}
              {(k.kind === "idea" || k.kind === "project") && (
                <span
                  className={`ml-2 inline-block rounded-md px-1.5 py-px text-[11px] font-bold ${
                    k.kind === "project"
                      ? "bg-red-50 text-brand-red"
                      : "bg-blue-50 text-brand"
                  }`}
                >
                  {KIND_LABEL[k.kind]}
                </span>
              )}
            </p>
            <p
              className={`mt-1.5 whitespace-pre-line break-words text-stone-900 ${
                full
                  ? "text-[17px] leading-relaxed"
                  : "text-[15px] leading-normal"
              }`}
            >
              {k.body}
            </p>
            {k.is_repost &&
              (k.business_id ? (
                <QuotedBusiness business={k.business ?? null} />
              ) : (
                <QuotedKonbit original={k.original} />
              ))}
          </>
        )}

        {images.length > 0 && (
          <div
            className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-stone-200 ${
              images.length === 2 ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {images.map((img, i) => (
              // Un toucher ouvre les photos en plein écran (balayage entre elles).
              <button
                key={img.path}
                type="button"
                onClick={() => setViewer(i)}
                aria-label={`Wè foto ${i + 1} an gwo`}
                className="block cursor-zoom-in"
              >
                <Image
                  src={mediaUrl(img.path)}
                  alt=""
                  width={img.width}
                  height={img.height}
                  sizes="(max-width: 640px) 90vw, 520px"
                  className={`w-full object-cover ${images.length === 2 ? "aspect-[4/5]" : "max-h-[520px]"}`}
                />
              </button>
            ))}
          </div>
        )}
        {viewer !== null && (
          <Lightbox
            images={images.map((img) => ({
              src: mediaUrl(img.path),
              width: img.width,
              height: img.height,
            }))}
            start={viewer}
            onClose={() => setViewer(null)}
          />
        )}

        <div className="mt-2 flex max-w-md items-center justify-between pr-2">
          <Link
            href={full ? "#repons" : href}
            className={`${action} hover:text-brand`}
            aria-label={`Repons: ${k.reply_count}`}
          >
            <span className="rounded-full p-2 group-hover:bg-blue-50">
              <ReplyIcon className="h-[18px] w-[18px]" />
            </span>
            {k.reply_count > 0 && k.reply_count}
          </Link>

          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={!!k.liked}
            aria-label={`Renmen: ${k.like_count}`}
            className={`${action} ${k.liked ? "text-brand-red" : "hover:text-brand-red"}`}
          >
            <span className="rounded-full p-2 group-hover:bg-red-50">
              <HeartIcon className="h-[18px] w-[18px]" filled={!!k.liked} />
            </span>
            {k.like_count > 0 && k.like_count}
          </button>

          {isKonbit && isMine ? (
            <span className={`${action} font-bold text-emerald-700`}>
              <span className="rounded-full bg-emerald-50 p-2">
                <HandshakeIcon className="h-[18px] w-[18px]" />
              </span>
              Òganizatè
            </span>
          ) : isKonbit && !k.joined && (ended || isFull) ? (
            <span className={`${action} font-semibold text-stone-400`}>
              <span className="rounded-full p-2">
                <HandshakeIcon className="h-[18px] w-[18px]" />
              </span>
              {ended ? "Fini" : "Plen"}
            </span>
          ) : canJoin ? (
            <button
              type="button"
              onClick={askJoin}
              aria-pressed={!!k.joined}
              className={
                k.joined
                  ? `${action} font-bold text-emerald-700`
                  : isKonbit
                    ? "flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[13px] font-bold text-white hover:opacity-90"
                    : `${action} hover:text-emerald-700`
              }
            >
              {(k.joined || !isKonbit) && (
                <span
                  className={`rounded-full p-2 ${k.joined ? "bg-emerald-50" : "group-hover:bg-emerald-50"}`}
                >
                  <HandshakeIcon className="h-[18px] w-[18px]" />
                </span>
              )}
              <span>
                {k.joined ? "Ou ladan" : isKonbit ? "Rejwenn" : "Mwen ladan"}
                {!isKonbit &&
                  k.participant_count > 0 &&
                  ` · ${k.participant_count}`}
              </span>
            </button>
          ) : (
            <span aria-hidden className="w-8" />
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => requireAccount(() => setRepostMenu((o) => !o))}
              aria-label={`Reposte: ${k.repost_count ?? 0}`}
              aria-haspopup="menu"
              aria-expanded={repostMenu}
              className={`${action} ${k.reposted ? "text-emerald-700" : "hover:text-emerald-700"}`}
            >
              <span className="rounded-full p-2 group-hover:bg-emerald-50">
                <RepostIcon className="h-[18px] w-[18px]" />
              </span>
              {(k.repost_count ?? 0) > 0 && k.repost_count}
            </button>
            {repostMenu && (
              <RepostMenu
                reposted={!!k.reposted}
                onClose={() => setRepostMenu(false)}
                onRepost={() => void toggleRepost()}
                onQuote={() => router.push(`/lanse?site=${k.id}`)}
              />
            )}
          </div>

          <button
            type="button"
            onClick={share}
            aria-label="Pataje"
            className={`${action} hover:text-brand`}
          >
            <span className="rounded-full p-2 group-hover:bg-blue-50">
              <ShareIcon className="h-[18px] w-[18px]" />
            </span>
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title={
            confirm === "join"
              ? `Ou vle rejwenn « ${k.title ?? "konbit sa a"} » vre?`
              : `Ou vle soti nan « ${k.title ?? "konbit sa a"} »?`
          }
          confirmLabel={confirm === "join" ? "Wi, mwen ladan" : "Wi, mwen soti"}
          tone={confirm === "join" ? "brand" : "danger"}
          busy={joining}
          onConfirm={() => void join(confirm === "join")}
          onCancel={() => setConfirm(null)}
        >
          {confirm === "join" ? (
            <p>
              {k.starts_at
                ? `Li kòmanse ${formatKonbitDate(k.starts_at)}. `
                : ""}
              Òganizatè a ak lòt moun yo pral konte sou ou. Ou ka ekri nan
              konbit la epi resevwa nouvèl li.
            </p>
          ) : (
            <p>
              Ou p ap ka ekri nan konbit la ankò, men ou ka rejwenn li ankò pita
              si gen plas.
            </p>
          )}
        </ConfirmDialog>
      )}
    </article>
  );
}

function PostMenu({
  mode,
  up,
  isMine,
  onClose,
  onDelete,
  onAskReport,
  onReport,
}: {
  mode: "menu" | "report";
  up: boolean;
  isMine: boolean;
  onClose: () => void;
  onDelete: () => void;
  onAskReport: () => void;
  onReport: (reason: AbuseReason) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);

  const item =
    "block w-full px-4 py-2.5 text-left text-[15px] font-semibold hover:bg-stone-50";

  return (
    <div
      ref={ref}
      role="menu"
      className={`absolute right-0 z-30 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl ${
        up ? "bottom-9" : "top-9"
      }`}
    >
      {mode === "menu" ? (
        isMine ? (
          <button
            type="button"
            role="menuitem"
            onClick={onDelete}
            className={`${item} text-brand-red`}
          >
            Efase konbit la
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            onClick={onAskReport}
            className={`${item} text-stone-800`}
          >
            Siyale yon abi
          </button>
        )
      ) : (
        <>
          <p className="px-4 pb-1 pt-2 text-sm font-bold text-stone-500">
            Poukisa w ap siyale l?
          </p>
          {ABUSE_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              role="menuitem"
              onClick={() => onReport(r.value)}
              className={`${item} font-medium text-stone-800`}
            >
              {r.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
