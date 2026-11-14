"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { refreshKonbit } from "@/app/actions/konbit";
import Avatar from "@/components/Avatar";
import EmojiButton, { useEmojiInsert } from "@/components/EmojiButton";
import { useAuth } from "@/components/auth/AuthProvider";
import { HeartIcon, MoreIcon, ReplyIcon, ShareIcon } from "@/components/Icons";
import { toast } from "@/components/Toaster";
import {
  ABUSE_REASONS,
  deleteReply,
  fetchMyReplyLikes,
  konbitErrorMessage,
  postReply,
  reportAbuse,
  setReplyLike,
  type AbuseReason,
  type ThreadReply,
} from "@/lib/konbit-actions";
import { displayName } from "@/lib/site";
import TimeAgo from "./TimeAgo";
import { useRequireAccount } from "./useRequireAccount";

const MAX = 500;

// Espace de discussion d'un konbit : des messages, et sous chacun ses
// réponses (une réponse à une réponse reste sous le même message).
// Dans un konbit, seuls les membres écrivent ; tout le monde lit, aime et partage.
export default function Thread({
  konbitId,
  isKonbit,
  canWrite,
  initial,
}: {
  konbitId: number;
  isKonbit: boolean;
  // Organisateur ou participant (konbit), ou tout compte (message simple).
  canWrite: boolean;
  initial: ThreadReply[];
}) {
  const { userId, profile } = useAuth();
  const requireAccount = useRequireAccount();
  const [replies, setReplies] = useState(initial);
  // Réponse en cours : sous quel message, en citant qui.
  const [replyTo, setReplyTo] = useState<{
    parentId: number;
    mention: string | null;
  } | null>(null);

  // J'aime de l'utilisateur sur les messages affichés.
  const likesFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || likesFor.current === userId) return;
    likesFor.current = userId;
    fetchMyReplyLikes(
      userId,
      initial.map((r) => r.id),
    )
      .then((liked) =>
        setReplies((list) =>
          list.map((r) => ({ ...r, liked: liked.has(r.id) })),
        ),
      )
      .catch(() => {});
  }, [userId, initial]);

  const { top, children } = useMemo(() => {
    const top = replies.filter((r) => r.parent_id === null);
    const children = new Map<number, ThreadReply[]>();
    for (const r of replies) {
      if (r.parent_id === null) continue;
      children.set(r.parent_id, [...(children.get(r.parent_id) ?? []), r]);
    }
    return { top, children };
  }, [replies]);

  function added(reply: ThreadReply) {
    setReplies((list) => [...list, reply]);
    void refreshKonbit(konbitId);
  }

  function removed(id: number) {
    // Un message supprimé emporte ses réponses.
    setReplies((list) => list.filter((r) => r.id !== id && r.parent_id !== id));
    void refreshKonbit(konbitId);
  }

  function updated(reply: ThreadReply) {
    setReplies((list) => list.map((r) => (r.id === reply.id ? reply : r)));
  }

  const startReply = (parentId: number, mention: string | null) =>
    requireAccount(() => {
      if (!canWrite) {
        toast(
          isKonbit
            ? "Rejwenn konbit la anvan pou w ka reponn."
            : "Konekte pou w ka reponn.",
          "error",
        );
        return;
      }
      setReplyTo({ parentId, mention });
    });

  return (
    <section id="repons" className="scroll-mt-16 border-t border-stone-200">
      <h2 className="px-4 pb-2 pt-4 text-lg font-extrabold text-stone-900">
        {isKonbit ? "Mesaj yo" : "Repons yo"}
        {replies.length > 0 && (
          <span className="ml-1.5 font-medium text-stone-500">
            ({replies.length})
          </span>
        )}
      </h2>

      {canWrite && profile ? (
        <Composer
          konbitId={konbitId}
          parentId={null}
          placeholder={
            isKonbit
              ? "Ekri yon mesaj pou moun ki nan konbit la…"
              : "Ekri repons ou…"
          }
          avatar={{
            name: profile.display_name || profile.pseudo || "",
            path: profile.avatar_path,
            seed: profile.id,
          }}
          onPosted={added}
        />
      ) : (
        <p className="mx-4 mb-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-stone-700">
          {!userId ? (
            <>
              <Link
                href={`/konekte?next=${encodeURIComponent(`/k/${konbitId}`)}`}
                className="font-bold text-brand underline"
              >
                Konekte
              </Link>{" "}
              {isKonbit
                ? "epi rejwenn konbit la pou w ka ekri."
                : "pou w ka reponn."}
            </>
          ) : isKonbit ? (
            "Se moun ki nan konbit la sèlman ki ka ekri la a. Peze « Rejwenn » anwo a pou w antre."
          ) : (
            "Chwazi yon tinon pou w ka reponn."
          )}
        </p>
      )}

      {top.length === 0 ? (
        <p className="px-4 pb-10 pt-6 text-center text-stone-500">
          {isKonbit
            ? "Poko gen mesaj. Moun ki nan konbit la ka kòmanse pale."
            : "Poko gen repons."}
        </p>
      ) : (
        <ul>
          {top.map((m) => (
            <li key={m.id} className="border-b border-stone-200">
              <Message
                reply={m}
                konbitId={konbitId}
                onReply={() => startReply(m.id, null)}
                onRemoved={removed}
                onUpdated={updated}
              />
              {((children.get(m.id)?.length ?? 0) > 0 ||
                replyTo?.parentId === m.id) && (
                <ul className="ml-[3.25rem] border-l-2 border-stone-100 pb-2">
                  {(children.get(m.id) ?? []).map((c) => (
                    <li key={c.id}>
                      <Message
                        reply={c}
                        konbitId={konbitId}
                        small
                        onReply={() =>
                          startReply(m.id, c.author?.pseudo ?? null)
                        }
                        onRemoved={removed}
                        onUpdated={updated}
                      />
                    </li>
                  ))}
                  {replyTo?.parentId === m.id && profile && (
                    <li>
                      <Composer
                        konbitId={konbitId}
                        parentId={m.id}
                        autoFocus
                        initialText={
                          replyTo.mention ? `@${replyTo.mention} ` : ""
                        }
                        placeholder="Ekri repons ou…"
                        avatar={{
                          name: profile.display_name || profile.pseudo || "",
                          path: profile.avatar_path,
                          seed: profile.id,
                        }}
                        onPosted={(r) => {
                          added(r);
                          setReplyTo(null);
                        }}
                        onCancel={() => setReplyTo(null)}
                      />
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Composer({
  konbitId,
  parentId,
  placeholder,
  avatar,
  initialText = "",
  autoFocus = false,
  onPosted,
  onCancel,
}: {
  konbitId: number;
  parentId: number | null;
  placeholder: string;
  avatar: { name: string; path: string | null; seed: string };
  initialText?: string;
  autoFocus?: boolean;
  onPosted: (reply: ThreadReply) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const insertEmoji = useEmojiInsert(area, text, setText, MAX);

  useEffect(() => {
    if (!autoFocus) return;
    const el = area.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const reply = await postReply(konbitId, text, parentId);
      setText("");
      onPosted(reply);
    } catch (err) {
      toast(konbitErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="flex gap-3 px-4 py-3">
      <Avatar
        name={avatar.name}
        avatarPath={avatar.path}
        seed={avatar.seed}
        size={parentId ? 32 : 40}
      />
      <div className="min-w-0 flex-1">
        <textarea
          ref={area}
          value={text}
          maxLength={MAX}
          rows={parentId ? 2 : 3}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(e);
          }}
          placeholder={placeholder}
          className="w-full resize-y rounded-2xl border border-stone-300 bg-surface px-4 py-2.5 text-[15px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <EmojiButton onPick={insertEmoji} />
          <span
            className={`mr-auto text-xs ${text.length > MAX - 50 ? "text-brand-red" : "text-stone-400"}`}
          >
            {text.length > 0 && `${text.length}/${MAX}`}
          </span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-100"
            >
              Anile
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="rounded-full bg-brand px-5 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "…" : parentId ? "Reponn" : "Voye"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Message({
  reply: r,
  konbitId,
  small = false,
  onReply,
  onRemoved,
  onUpdated,
}: {
  reply: ThreadReply;
  konbitId: number;
  small?: boolean;
  onReply: () => void;
  onRemoved: (id: number) => void;
  onUpdated: (reply: ThreadReply) => void;
}) {
  const { userId } = useAuth();
  const requireAccount = useRequireAccount();
  const [menu, setMenu] = useState<"closed" | "menu" | "report">("closed");
  const busy = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const name = displayName(
    r.author?.display_name ?? null,
    r.author?.pseudo ?? null,
  );
  const mine = userId === r.author_id;

  useEffect(() => {
    if (menu === "closed") return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu("closed");
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  function like() {
    requireAccount(async (me) => {
      if (busy.current) return;
      busy.current = true;
      const on = !r.liked;
      onUpdated({
        ...r,
        liked: on,
        like_count: Math.max(0, r.like_count + (on ? 1 : -1)),
      });
      try {
        await setReplyLike(r.id, me, on);
      } catch (e) {
        onUpdated(r);
        toast(konbitErrorMessage(e), "error");
      } finally {
        busy.current = false;
      }
    });
  }

  async function share() {
    const url = `${window.location.origin}/k/${konbitId}#m-${r.id}`;
    try {
      if (navigator.share)
        await navigator.share({ title: `Mesaj ${name} sou Konbit 509`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Lyen an kopye.");
      }
    } catch {
      // Partage annulé.
    }
  }

  async function remove() {
    setMenu("closed");
    if (!window.confirm("Efase mesaj sa a?")) return;
    try {
      await deleteReply(r.id);
      onRemoved(r.id);
      toast("Mesaj la efase.");
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
    }
  }

  async function report(reason: AbuseReason) {
    setMenu("closed");
    try {
      await reportAbuse("reply", r.id, reason);
      toast("Mèsi. N ap gade sa.");
    } catch (e) {
      toast(konbitErrorMessage(e), "error");
    }
  }

  const action =
    "group flex items-center gap-1 rounded-full text-[13px] text-stone-500";
  const item =
    "block w-full px-4 py-2.5 text-left text-[15px] font-semibold text-stone-800 hover:bg-stone-50";

  return (
    <article
      id={`m-${r.id}`}
      className={`flex scroll-mt-20 gap-3 target:bg-blue-50/60 ${small ? "py-2.5 pl-3 pr-4" : "px-4 py-3"}`}
    >
      <Link
        href={r.author?.pseudo ? `/u/${r.author.pseudo}` : "#"}
        className="shrink-0"
      >
        <Avatar
          name={name}
          avatarPath={r.author?.avatar_path ?? null}
          seed={r.author_id}
          size={small ? 32 : 40}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate text-[14px]">
            <span className="font-bold text-stone-900">{name}</span>
            <span className="text-stone-500">
              {" · "}
              <TimeAgo iso={r.created_at} />
            </span>
          </p>
          <div ref={menuRef} className="relative -mr-2 -mt-1">
            <button
              type="button"
              onClick={() =>
                setMenu((m) => (m === "closed" ? "menu" : "closed"))
              }
              aria-label="Plis aksyon"
              className="rounded-full p-1 text-stone-400 hover:bg-blue-50 hover:text-brand"
            >
              <MoreIcon className="h-4 w-4" />
            </button>
            {menu !== "closed" && (
              <div
                role="menu"
                className="absolute right-0 top-7 z-30 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-surface py-1 shadow-xl"
              >
                {menu === "menu" ? (
                  mine ? (
                    <button
                      type="button"
                      className={`${item} text-brand-red`}
                      onClick={() => void remove()}
                    >
                      Efase mesaj la
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={item}
                      onClick={() => requireAccount(() => setMenu("report"))}
                    >
                      Siyale yon abi
                    </button>
                  )
                ) : (
                  <>
                    <p className="px-4 pb-1 pt-2 text-sm font-bold text-stone-500">
                      Poukisa w ap siyale l?
                    </p>
                    {ABUSE_REASONS.map((x) => (
                      <button
                        key={x.value}
                        type="button"
                        className={`${item} font-medium`}
                        onClick={() => void report(x.value)}
                      >
                        {x.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-normal text-stone-900">
          {r.body}
        </p>
        <div className="mt-1 flex items-center gap-4">
          <button
            type="button"
            onClick={onReply}
            className={`${action} hover:text-brand`}
          >
            <span className="rounded-full p-1.5 group-hover:bg-blue-50">
              <ReplyIcon className="h-4 w-4" />
            </span>
            Reponn
          </button>
          <button
            type="button"
            onClick={like}
            aria-pressed={!!r.liked}
            aria-label={`Renmen: ${r.like_count}`}
            className={`${action} ${r.liked ? "text-brand-red" : "hover:text-brand-red"}`}
          >
            <span className="rounded-full p-1.5 group-hover:bg-red-50">
              <HeartIcon className="h-4 w-4" filled={!!r.liked} />
            </span>
            {r.like_count > 0 && r.like_count}
          </button>
          <button
            type="button"
            onClick={() => void share()}
            aria-label="Pataje"
            className={`${action} hover:text-brand`}
          >
            <span className="rounded-full p-1.5 group-hover:bg-blue-50">
              <ShareIcon className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
