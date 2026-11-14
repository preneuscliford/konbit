"use client";

import { useCallback, useEffect, useState } from "react";
import { inputClass } from "@/components/auth/PasswordInput";
import { useAuth } from "@/components/auth/AuthProvider";
import TimeAgo from "@/components/feed/TimeAgo";
import { toast } from "@/components/Toaster";
import {
  adminErrorMessage,
  deleteAnnouncement,
  fetchAdminStats,
  fetchAnnouncements,
  sendAnnouncement,
  type Announcement,
} from "@/lib/admin";
import { SectionTitle, Spinner } from "./AdminShell";

const TITLE_MAX = 80;
const BODY_MAX = 500;

// Annonce à tous les comptes (notification dans l'app et le site, et push
// sur téléphone). Admin seulement ; la base le revérifie.
export default function AnnouncePanel() {
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [accounts, setAccounts] = useState<number | null>(null);
  const [history, setHistory] = useState<Announcement[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadHistory = useCallback(() => {
    fetchAnnouncements()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadHistory();
    fetchAdminStats()
      .then((s) => setAccounts(s.accounts))
      .catch(() => {});
  }, [isAdmin, loadHistory]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 3) return;
    if (
      !window.confirm(
        `Anons lan pral voye bay ${accounts ?? "tout"} kont. Ou pa ka anile l apre.`,
      )
    )
      return;
    setBusy(true);
    try {
      const sent = await sendAnnouncement(title, body);
      toast(`Anons voye bay ${sent} kont.`);
      setTitle("");
      setBody("");
      loadHistory();
    } catch (err) {
      toast(adminErrorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(a: Announcement) {
    if (
      !window.confirm(
        "Efase anons lan?\n\nLi ap efase pou tout moun, menm nan notifikasyon yo. Ou pa ka jwenn li ankò.",
      )
    )
      return;
    try {
      await deleteAnnouncement(a.id);
      toast("Anons lan efase.");
      setHistory((h) => h?.filter((x) => x.id !== a.id) ?? null);
    } catch (err) {
      toast(adminErrorMessage(err), "error");
    }
  }

  return (
    <div className="px-4 pb-10 pt-4">
      <p className="text-sm text-stone-600">
        Mesaj sa a ap parèt nan notifikasyon tout moun ki gen yon kont, epi kòm
        notifikasyon sou telefòn yo.
      </p>

      <form onSubmit={send} className="mt-4 space-y-4">
        <label className="block space-y-1.5">
          <span className="flex justify-between text-sm font-semibold text-stone-700">
            Tit
            <span className="font-normal text-stone-400">
              {TITLE_MAX - title.length}
            </span>
          </span>
          <input
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Egzanp: Nouvo fonksyon"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="flex justify-between text-sm font-semibold text-stone-700">
            Mesaj
            <span className="font-normal text-stone-400">
              {BODY_MAX - body.length}
            </span>
          </span>
          <textarea
            value={body}
            maxLength={BODY_MAX}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Kisa ki chanje, an kout."
            className={`${inputClass} resize-y`}
          />
        </label>

        {(title.trim() || body.trim()) && (
          <div className="rounded-2xl border border-stone-200 p-4">
            <p className="text-xs font-bold uppercase text-stone-500">Apèsi</p>
            <p className="mt-1 font-bold text-stone-900">
              Ekip Konbit 509 · {title || "…"}
            </p>
            <p className="whitespace-pre-line text-sm text-stone-700">{body}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || title.trim().length < 3 || body.trim().length < 3}
          className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : "Voye bay tout moun"}
        </button>
      </form>

      <SectionTitle>Anons ki deja voye</SectionTitle>
      {!history ? (
        <Spinner />
      ) : history.length === 0 ? (
        <p className="text-sm text-stone-500">Poko gen anons.</p>
      ) : (
        <ul className="divide-y divide-stone-200">
          {history.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-stone-900">{a.title}</p>
                <p className="whitespace-pre-line text-sm text-stone-700">
                  {a.body}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  <TimeAgo iso={a.created_at} />
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(a)}
                className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-red hover:bg-red-50"
              >
                Efase
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
