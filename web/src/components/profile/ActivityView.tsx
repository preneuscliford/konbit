"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { refreshFeed, refreshKonbit } from "@/app/actions/konbit";
import { useAuth } from "@/components/auth/AuthProvider";
import TimeAgo from "@/components/feed/TimeAgo";
import { toast } from "@/components/Toaster";
import {
  fetchActivitySummary,
  fetchMyKonbitRefs,
  fetchMyKonbits,
  fetchMyReplies,
  type ActivitySection,
  type ActivitySummary,
  type KonbitRef,
  type ModerationStatus,
  type MyKonbit,
  type MyReply,
} from "@/lib/activity";
import {
  deleteKonbit,
  deleteReply,
  setLike,
  setParticipation,
} from "@/lib/konbit-actions";

const SECTIONS: { key: ActivitySection; label: string; empty: string }[] = [
  { key: "konbits", label: "Piblikasyon", empty: "Ou poko pibliye anyen." },
  { key: "replies", label: "Repons", empty: "Ou poko reponn okenn konbit." },
  {
    key: "joined",
    label: "Mwen ladan",
    empty: "Ou poko di « Mwen ladan » pou okenn konbit.",
  },
  { key: "liked", label: "J’aime", empty: "Ou poko renmen okenn konbit." },
];

type Row =
  | { section: "konbits"; item: MyKonbit }
  | { section: "replies"; item: MyReply }
  | { section: "joined" | "liked"; item: KonbitRef };

const short = (text: string, max = 140) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

const STATUS: Record<Exclude<ModerationStatus, "visible">, string> = {
  hidden: "An revizyon",
  removed: "Retire pa moderasyon",
};

// « Aktivite mwen » : compteurs, puis la liste de la section choisie avec
// suppression (ou « Kite » / « Retire ») élément par élément.
export default function ActivityView() {
  const router = useRouter();
  const { ready, userId } = useAuth();
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [section, setSection] = useState<ActivitySection>("konbits");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ready && !userId) router.replace("/konekte?next=%2Faktivite");
  }, [ready, userId, router]);

  const loadSummary = useCallback(() => {
    if (!userId) return;
    fetchActivitySummary(userId)
      .then(setSummary)
      .catch(() => {});
  }, [userId]);

  useEffect(loadSummary, [loadSummary]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load: Promise<Row[]> =
      section === "konbits"
        ? fetchMyKonbits(userId).then((l) =>
            l.map((item) => ({ section, item })),
          )
        : section === "replies"
          ? fetchMyReplies(userId).then((l) =>
              l.map((item) => ({ section, item })),
            )
          : fetchMyKonbitRefs(userId, section).then((l) =>
              l.map((item) => ({ section, item })),
            );
    load
      .then((list) => {
        if (cancelled) return;
        setRows(list);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [userId, section]);

  async function remove(row: Row) {
    if (!userId) return;
    const question =
      row.section === "konbits"
        ? "Efase piblikasyon sa a? Repons, foto ak patisipasyon li yo ap efase tou. Ou p ap ka jwenn li ankò."
        : row.section === "replies"
          ? "Efase repons sa a? Ou p ap ka jwenn li ankò."
          : row.section === "joined"
            ? "Kite konbit sa a?"
            : null;
    if (question && !window.confirm(question)) return;
    try {
      if (row.section === "konbits") {
        await deleteKonbit(row.item.id, row.item.media ?? []);
        await refreshFeed();
        await refreshKonbit(row.item.id);
      } else if (row.section === "replies") {
        await deleteReply(row.item.id);
        if (row.item.konbit) await refreshKonbit(row.item.konbit.id);
      } else if (row.item.konbit) {
        const id = row.item.konbit.id;
        if (row.section === "joined") await setParticipation(id, userId, false);
        else await setLike(id, userId, false);
        await refreshKonbit(id);
      }
      setRows((list) => list?.filter((r) => r !== row) ?? null);
      loadSummary();
      toast(
        row.section === "konbits" || row.section === "replies"
          ? "Efase."
          : "Fini.",
      );
    } catch {
      toast("Nou pa ka fè sa kounye a. Eseye ankò.", "error");
    }
  }

  if (!ready || !userId) {
    return (
      <div className="mx-auto my-16 h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
    );
  }

  const current = SECTIONS.find((s) => s.key === section)!;

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-4 gap-2">
        {SECTIONS.map((s) => {
          const active = s.key === section;
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                setRows(null);
                setSection(s.key);
              }}
              className={`rounded-2xl border px-2 py-3 text-center transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 hover:bg-stone-50"
              }`}
            >
              <span className="block text-xl font-extrabold">
                {summary ? summary[s.key] : "–"}
              </span>
              <span
                className={`block truncate text-xs font-semibold ${active ? "text-white/90" : "text-stone-500"}`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {summary && (
        <div className="mt-3 space-y-1 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <p>
            Sou piblikasyon ou yo: <b>{summary.receivedParticipants}</b> moun
            ladan · <b>{summary.receivedLikes}</b> j’aime ·{" "}
            <b>{summary.receivedReplies}</b> repons
          </p>
          <p>
            <b>{summary.following}</b> abònman · <b>{summary.followers}</b>{" "}
            abòne
          </p>
          <p>{summary.reportsSent} siyalman abi ou voye (yo rete prive)</p>
        </div>
      )}

      <h2 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wide text-stone-500">
        {current.label}
      </h2>

      {failed ? (
        <p className="py-10 text-center text-stone-500">
          Nou pa ka chaje lis la. Eseye ankò.
        </p>
      ) : !rows ? (
        <div className="mx-auto my-10 h-7 w-7 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-stone-500">{current.empty}</p>
      ) : (
        <ul className="divide-y divide-stone-200">
          {rows.map((row) => (
            <ActivityRow
              key={`${row.section}-${"id" in row.item ? row.item.id : row.item.konbit?.id}`}
              row={row}
              onRemove={() => void remove(row)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActivityRow({ row, onRemove }: { row: Row; onRemove: () => void }) {
  let href: string;
  let text: string;
  let meta: React.ReactNode = null;
  let status: ModerationStatus | null = null;
  let action = "Efase";

  if (row.section === "konbits") {
    const k = row.item;
    href = `/k/${k.id}`;
    text = k.title || k.body || "(foto)";
    status = k.status;
    meta = `${k.participant_count} ladan · ${k.like_count} j’aime · ${k.reply_count} repons`;
  } else if (row.section === "replies") {
    const r = row.item;
    href = r.konbit ? `/k/${r.konbit.id}` : "#";
    text = r.body;
    status = r.status;
    if (r.konbit) meta = `Sou: ${short(r.konbit.title || r.konbit.body, 60)}`;
  } else {
    const k = row.item.konbit!;
    href = `/k/${k.id}`;
    text = k.title || k.body;
    if (k.author)
      meta = `${k.author.display_name || k.author.pseudo} · @${k.author.pseudo}`;
    action = row.section === "joined" ? "Kite" : "Retire";
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <Link href={href} className="min-w-0 flex-1">
        <span className="block text-[15px] text-stone-900">{short(text)}</span>
        <span className="mt-0.5 block text-xs text-stone-500">
          <TimeAgo iso={row.item.created_at} />
          {meta && <> · {meta}</>}
        </span>
        {status && status !== "visible" && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              status === "removed"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {STATUS[status]}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={onRemove}
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-stone-100 ${
          action === "Efase" ? "text-brand-red" : "text-stone-600"
        }`}
      >
        {action}
      </button>
    </li>
  );
}
