"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { refreshFeed, refreshKonbit } from "@/app/actions/konbit";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import TimeAgo from "@/components/feed/TimeAgo";
import { toast } from "@/components/Toaster";
import {
  adminErrorMessage,
  CONTENT_LABELS,
  fetchModerationQueue,
  moderateContent,
  type QueueItem,
} from "@/lib/admin";
import { ABUSE_LABELS } from "@/lib/notifications";
import { mediaUrl } from "@/lib/storage";
import { SectionTitle, Spinner } from "./AdminShell";
import SanctionPanel from "./SanctionPanel";

const keyOf = (q: QueueItem) => `${q.target_type}-${q.target_id}`;
const reasonsText = (q: QueueItem) =>
  q.reasons.map((r) => ABUSE_LABELS[r] ?? r).join(", ");

const STATUS = {
  visible: ["Vizib", "bg-emerald-50 text-emerald-700"],
  hidden: ["Kache otomatikman", "bg-amber-50 text-amber-700"],
  removed: ["Retire", "bg-red-50 text-red-700"],
} as const;

// File des signalements : la liste à gauche (ou en haut sur téléphone), le
// contenu choisi avec la décision et la sanction de l'auteur.
export default function ReportsQueue() {
  const { isModerator } = useAuth();
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<QueueItem | null>(null);

  const load = useCallback(() => {
    fetchModerationQueue()
      .then((q) => {
        setQueue(q);
        setError(null);
      })
      .catch((e) => setError(adminErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (isModerator) load();
  }, [isModerator, load]);

  if (error)
    return <p className="px-6 py-12 text-center text-stone-500">{error}</p>;
  if (!queue) return <Spinner />;

  if (selected) {
    return (
      <ReportDetail
        item={selected}
        onBack={() => {
          setSelected(null);
          load();
        }}
      />
    );
  }

  if (queue.length === 0)
    return (
      <p className="px-6 py-16 text-center text-stone-500">
        Pa gen anyen pou revize. 👍
      </p>
    );

  return (
    <ul className="divide-y divide-stone-200">
      {queue.map((q) => (
        <li key={keyOf(q)}>
          <button
            type="button"
            onClick={() => setSelected(q)}
            className="flex w-full gap-3 px-4 py-3 text-left hover:bg-stone-50"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-extrabold uppercase text-brand">
                  {CONTENT_LABELS[q.target_type]}
                </span>
                <span className="font-bold text-brand-red">
                  {q.report_count} siyalman
                </span>
                {q.status && q.status !== "visible" && (
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[q.status][1]}`}
                  >
                    {STATUS[q.status][0]}
                  </span>
                )}
              </span>
              <span className="mt-1 line-clamp-2 block text-[15px] text-stone-900">
                {q.body ?? "(kontni an efase)"}
              </span>
              <span className="mt-0.5 block text-xs text-stone-500">
                {reasonsText(q)} ·{" "}
                {q.author_pseudo ? `@${q.author_pseudo} · ` : ""}
                <TimeAgo iso={q.last_reported_at} />
              </span>
            </span>
            <span className="self-center text-stone-400">›</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ReportDetail({
  item,
  onBack,
}: {
  item: QueueItem;
  onBack: () => void;
}) {
  const { isAdmin } = useAuth();
  const [decided, setDecided] = useState<"remove" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "remove" | "restore") {
    const question =
      decision === "remove"
        ? "Retire kontni sa a?\n\nLi ap retire pou tout moun. Otè a ap resevwa yon notifikasyon."
        : "Kenbe kontni sa a?\n\nLi rete (oswa vin parèt ankò) epi siyalman yo fèmen.";
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      await moderateContent(
        item.target_type,
        item.target_id,
        decision,
        decision === "remove" ? item.reasons[0] : undefined,
      );
      if (item.konbit_id) {
        await refreshKonbit(item.konbit_id);
        if (item.target_type === "konbit") await refreshFeed();
      }
      setDecided(decision);
      toast("Fèt.");
    } catch (e) {
      toast(adminErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const status =
    decided === "remove" ? "removed" : decided ? "visible" : item.status;
  const canOpen =
    item.konbit_id &&
    (item.target_type === "reply" || item.status === "visible") &&
    decided !== "remove";
  const images = item.media.filter((m) => m.type === "image");

  return (
    <div className="px-4 pb-10 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-sm font-semibold text-brand hover:underline"
      >
        ‹ Tout siyalman yo
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-extrabold uppercase text-brand">
          {CONTENT_LABELS[item.target_type]}
        </span>
        <span className="font-bold text-brand-red">
          {item.report_count} siyalman
        </span>
        {status && (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${STATUS[status][1]}`}
          >
            {STATUS[status][0]}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-stone-500">
        {reasonsText(item)} · <TimeAgo iso={item.last_reported_at} />
      </p>

      <div className="mt-3 space-y-3 rounded-2xl border border-stone-200 p-4">
        <p className="whitespace-pre-line text-[15px] text-stone-900">
          {item.body ?? "(kontni an efase)"}
        </p>
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <a
                key={img.path}
                href={mediaUrl(img.path)}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square overflow-hidden rounded-xl bg-stone-100"
              >
                <Image
                  src={mediaUrl(img.path)}
                  alt=""
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>

      {canOpen && (
        <Link
          href={`/k/${item.konbit_id}`}
          target="_blank"
          className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
        >
          Wè l sou sit la ↗
        </Link>
      )}

      {item.author_id && (
        <Link
          href={`/admin/itilizate?id=${item.author_id}`}
          className="mt-3 flex items-center gap-3 rounded-2xl border border-stone-200 p-3 hover:bg-stone-50"
        >
          <Avatar
            name={item.author_name || item.author_pseudo || "?"}
            avatarPath={item.author_avatar}
            seed={item.author_id}
            size={36}
          />
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-stone-900">
              {item.author_name || item.author_pseudo}
            </span>
            {item.author_pseudo && (
              <span className="block text-xs text-stone-500">
                @{item.author_pseudo}
              </span>
            )}
          </span>
          <span className="text-stone-400">›</span>
        </Link>
      )}

      <SectionTitle>Desizyon sou kontni an</SectionTitle>
      {decided ? (
        <p className="font-semibold text-emerald-700">
          {decided === "remove" ? "Kontni an retire." : "Kontni an kenbe."}
        </p>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide("restore")}
            className="flex-1 rounded-full border border-stone-300 py-3 font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
          >
            Kenbe l
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide("remove")}
            className="flex-1 rounded-full bg-brand-red py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            Retire l
          </button>
        </div>
      )}

      {item.author_id && (
        <>
          <SectionTitle>Otè a</SectionTitle>
          <p className="mb-3 text-xs text-stone-500">
            Si sa nesesè, ou ka avèti l oswa limite kont li. L ap resevwa yon
            notifikasyon.
          </p>
          <SanctionPanel
            userId={item.author_id}
            isAdmin={isAdmin}
            defaultReason={item.reasons[0]}
            content={{ type: item.target_type, id: item.target_id }}
          />
        </>
      )}
    </div>
  );
}
