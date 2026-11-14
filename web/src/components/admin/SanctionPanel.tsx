"use client";

import { useState } from "react";
import { inputClass } from "@/components/auth/PasswordInput";
import { toast } from "@/components/Toaster";
import { adminErrorMessage, moderateUser, type ContentType } from "@/lib/admin";
import { ABUSE_REASONS, type AbuseReason } from "@/lib/konbit-actions";

const RESTRICT_DAYS = [1, 3, 7, 30];
const NOTE_MAX = 500;

const CONFIRM = {
  warn: "Moun nan ap resevwa yon notifikasyon ak rezon an. Pa gen anyen ki bloke.",
  restrict:
    "Moun nan ap ka li, men li p ap ka pibliye, reponn, patisipe ni swiv moun pandan peryòd sa a.",
  suspend:
    "Kont lan p ap ka pibliye ankò e tout piblikasyon ak repons li yo ap retire. Se ou sèlman ki ka leve sa.",
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition ${
    active
      ? "border-brand bg-blue-50 font-semibold text-brand"
      : "border-stone-300 text-stone-700 hover:bg-stone-50"
  }`;

// Avertir, limiter (jours) ou suspendre (admin seulement) un compte. La
// personne reçoit une notification avec le motif et le message facultatif.
export default function SanctionPanel({
  userId,
  isAdmin,
  defaultReason,
  content,
  onDone,
}: {
  userId: string;
  isAdmin: boolean;
  defaultReason?: AbuseReason;
  content?: { type: ContentType; id: number };
  onDone?: () => void;
}) {
  const [reason, setReason] = useState<AbuseReason | null>(
    defaultReason ?? null,
  );
  const [note, setNote] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  async function apply(action: "warn" | "restrict" | "suspend") {
    if (!reason) return toast("Chwazi yon rezon anvan.", "error");
    const label =
      action === "warn"
        ? "Voye yon avètisman"
        : action === "restrict"
          ? `Limite pou ${days} jou`
          : "Sispann kont lan";
    if (!window.confirm(`${label}?\n\n${CONFIRM[action]}`)) return;
    setBusy(true);
    try {
      await moderateUser({
        userId,
        action,
        reason,
        note: note.trim() || undefined,
        days: action === "restrict" ? days : undefined,
        content,
      });
      toast("Fèt.");
      setNote("");
      onDone?.();
    } catch (e) {
      toast(adminErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-stone-700">Rezon</p>
      <div className="flex flex-wrap gap-1.5">
        {ABUSE_REASONS.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={reason === r.value}
            onClick={() => setReason(r.value)}
            className={chip(reason === r.value)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-stone-700">
          Mesaj pou moun nan (opsyonèl)
        </span>
        <textarea
          value={note}
          maxLength={NOTE_MAX}
          rows={2}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Egzanp: Tanpri respekte lòt moun nan repons ou yo."
          className={`${inputClass} resize-y`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply("warn")}
          className="rounded-full border border-stone-300 px-4 py-2 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
        >
          Voye yon avètisman
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RESTRICT_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={days === d}
            onClick={() => setDays(d)}
            className={chip(days === d)}
          >
            {d} j
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply("restrict")}
          className="rounded-full border border-amber-400 bg-amber-50 px-4 py-2 font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          Limite pou {days} jou
        </button>
      </div>

      {isAdmin && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void apply("suspend")}
          className="rounded-full bg-brand-red px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Sispann kont lan
        </button>
      )}
    </div>
  );
}
